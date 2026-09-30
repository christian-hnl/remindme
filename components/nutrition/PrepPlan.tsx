'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChefHat, Hand, Hourglass } from 'lucide-react';
import { CheckButton } from '@/components/ui/CheckButton';
import type { PrepSessionView, WeekView } from '@/lib/nutrition/views';
import { STORAGE_META, StorageBadge } from './shared';

interface PrepPlanProps {
  week: WeekView;
  onToggleStep: (stepId: string, done: boolean) => void;
  /** Opens a recipe with the amounts for the whole batch. */
  onOpenRecipe: (recipeId: string, portions: number, context: string) => void;
}

const LANES = ['Ofen', 'Herd', 'Herd 2', 'Arbeitsfläche'] as const;

const dateLabel = (date: string) => `${date.slice(8)}.${date.slice(5, 7)}.`;

/** What runs in parallel: one row per station, bars along the clock. */
function Timeline({ session }: { session: PrepSessionView }) {
  const total = Math.max(15, session.minutes);
  const lanes = LANES.filter((lane) => session.steps.some((s) => s.lane === lane));
  const ticks = Array.from({ length: Math.floor(total / 30) + 1 }, (_, i) => i * 30);
  const [h, m] = session.start.split(':').map(Number);
  const clock = (offset: number) => {
    const t = h * 60 + m + offset;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="relative ml-24 h-5">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 font-mono text-[10px] text-ink-3 tabular" style={{ left: `${(t / total) * 100}%` }}>
              {clock(t)}
            </span>
          ))}
        </div>
        {lanes.map((lane) => (
          <div key={lane} className="flex items-center gap-2 py-1">
            <span className="w-[88px] flex-shrink-0 truncate text-[12px] font-bold text-ink-2">{lane}</span>
            <div className="relative h-7 flex-1 rounded-[6px] bg-inset">
              {ticks.map((t) => (
                <span key={t} className="absolute inset-y-0 w-px bg-line/10" style={{ left: `${(t / total) * 100}%` }} aria-hidden />
              ))}
              {session.steps
                .filter((s) => s.lane === lane)
                .map((s) => (
                  <span
                    key={s.id}
                    title={`${s.at}–${s.until} ${s.title}`}
                    className={`absolute inset-y-1 overflow-hidden rounded-[4px] px-1.5 text-[10px] font-bold leading-5 ${
                      s.done ? 'bg-leaf/70 text-on-accent' : s.active ? 'bg-accent text-on-accent' : 'hatch border border-accent/40 text-ink-2'
                    }`}
                    style={{ left: `${(s.start / total) * 100}%`, width: `${Math.max(2, (s.duration / total) * 100)}%` }}
                  >
                    <span className="block truncate">{s.title}</span>
                  </span>
                ))}
            </div>
          </div>
        ))}
        <p className="ml-24 mt-1 flex flex-wrap gap-3 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-[3px] bg-accent" /> Hände dran
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="hatch h-2.5 w-4 rounded-[3px] border border-accent/40" /> läuft von selbst
          </span>
        </p>
      </div>
    </div>
  );
}

export function PrepPlan({ week, onToggleStep, onOpenRecipe }: PrepPlanProps) {
  const sessions = week.prep.sessions;
  const [active, setActive] = useState(sessions[0]?.id ?? 'sunday');
  useEffect(() => {
    // Open the session that's coming up next: Wednesday once Sunday is done.
    const next = sessions.find((s) => !s.done) ?? sessions[0];
    if (next) setActive(next.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week.weekStart]);
  const session = sessions.find((s) => s.id === active) ?? sessions[0];
  const doneCount = session ? session.steps.filter((s) => s.done).length : 0;

  return (
    <section className="card" aria-label="Meal Prep">
      <div className="p-4 pb-2 sm:p-5 sm:pb-2">
        <p className="eyebrow">Prep für {week.label}</p>
        <h2 className="card-title mt-1">Prep-Ablauf</h2>
        {week.simple ? (
          <p className="mt-1 text-[13px] text-ink-3">
            Einfach-Woche: statt der Rezepte kochst du schnelle Gerichte wie Huhn mit Reis. Saucen, Snacks und der Ablauf unten sind darauf abgestimmt.
          </p>
        ) : (
          week.template && <p className="mt-1 text-[13px] text-ink-3">{week.template.description}</p>
        )}
      </div>

      {sessions.length > 1 && (
        <div className="segmented mx-4 mt-2 grid-cols-2 sm:mx-5" role="tablist">
          {sessions.map((s) => (
            <button key={s.id} type="button" role="tab" aria-pressed={active === s.id} onClick={() => setActive(s.id)} className="segmented-item text-[13px]">
              {s.id === 'sunday' ? 'Sonntag' : 'Mittwoch'}
              <span className="font-mono text-[11px] font-medium text-ink-3">{s.minutes} min</span>
            </button>
          ))}
        </div>
      )}

      {session ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3 sm:px-5">
            <p className="font-display text-[18px] font-semibold text-ink">
              {session.label} · {dateLabel(session.date)}
              {session.done && <span className="chip ml-2 border-leaf/30 text-leaf">erledigt</span>}
              {!session.done && session.date < new Date().toISOString().slice(0, 10) && <span className="chip ml-2">vorbei</span>}
            </p>
            <p className="font-mono text-[13px] text-ink-2 tabular">
              {session.start}–{session.end} · {doneCount}/{session.steps.length} erledigt
            </p>
          </div>

          <div className="px-4 py-3 sm:px-5">
            <Timeline session={session} />
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-line/10 px-4 py-3 sm:px-5 lg:grid-cols-5">
            <ol className="min-w-0 lg:col-span-3">
              {session.steps.map((s) => (
                <li key={s.id} className="flex items-start gap-3 py-2">
                  <CheckButton checked={s.done} onChange={() => onToggleStep(s.id, !s.done)} label={s.done ? `${s.title} wieder öffnen` : `${s.title} erledigt`} className="mt-0.5" />
                  <span className="w-11 flex-shrink-0 pt-0.5 font-mono text-[12px] text-ink-3 tabular">{s.at}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[14px] font-bold leading-snug ${s.done ? 'text-ink-3 line-through' : 'text-ink'}`}>{s.title}</span>
                    {s.detail && <span className="block text-[12px] text-ink-3">{s.detail}</span>}
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-3">
                      {s.active ? <Hand className="h-3 w-3" /> : <Hourglass className="h-3 w-3" />}
                      {s.lane} · {s.duration} min
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="min-w-0 lg:col-span-2">
              <p className="eyebrow mb-2 flex items-center gap-1.5">
                <ChefHat className="h-3.5 w-3.5" /> Das kochst du – tippen für die Mengen
              </p>
              <ul className="space-y-1.5">
                {session.cook.map((c) => (
                  <li key={c.recipeId}>
                    <button
                      type="button"
                      onClick={() => onOpenRecipe(c.recipeId, c.portions, `${session.label} · ${c.boxes} ${c.boxes === 1 ? 'Box' : 'Boxen'}`)}
                      className="flex w-full items-center justify-between gap-2 rounded-[10px] bg-inset px-3 py-2 text-left transition-colors hover:bg-accent/10"
                      title="Rezept mit den Mengen für alle Boxen"
                    >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-bold text-ink">{c.name}</span>
                      <span className="text-[12px] text-ink-3">
                        {c.fridge > 0 && `${c.fridge}× Kühlschrank`}
                        {c.fridge > 0 && c.freezer > 0 && ' · '}
                        {c.freezer > 0 && `${c.freezer}× Tiefkühl`}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-right font-mono tabular">
                      <span className="block text-[15px] font-semibold text-ink">×{c.boxes}</span>
                      {c.portions !== c.boxes && <span className="block text-[11px] text-ink-3">{c.portions.toLocaleString('de-DE')} Port.</span>}
                    </span>
                    </button>
                  </li>
                ))}
                {session.cook.length === 0 && <li className="text-[13px] text-ink-3">Nichts zu kochen.</li>}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <p className="px-5 py-6 text-[14px] text-ink-3">Diese Woche braucht keinen Prep.</p>
      )}

      {/* Box overview */}
      <div className="border-t border-line/10 px-4 py-3 sm:px-5">
        <p className="eyebrow mb-2">Boxen der Woche</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {week.prep.boxes.map((b) => (
            <div key={b.day} className="rounded-[12px] border border-line/10 p-2.5">
              <p className="font-display text-[15px] font-semibold text-ink">{b.short}</p>
              <ul className="mt-1 space-y-1.5">
                {b.items
                  .filter((i) => i.storage !== 'fresh' || i.slot === 'lunch' || i.slot === 'snack')
                  .map((i) => {
                    const Meta = STORAGE_META[i.storage ?? 'fresh'];
                    return (
                      <li key={i.entryId} className="text-[12px]">
                        <span className="flex items-start gap-1.5">
                          <Meta.Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${Meta.className}`} />
                          <span className="min-w-0">
                            <span className="block font-bold leading-snug text-ink">{i.name}</span>
                            <span className="text-ink-3">
                              {i.label}
                              {i.session && ` · gekocht ${i.session === 'sunday' ? 'So' : 'Mi'}`}
                              {i.thaw && ' · Vorabend auftauen'}
                              {i.storage === 'fresh' && ' · frisch/abends'}
                            </span>
                          </span>
                        </span>
                        {i.problem && <span className="ml-5 block text-pen">{i.problem}</span>}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-3">
          <StorageBadge storage="fridge" />
          <StorageBadge storage="freezer" thaw />
          <StorageBadge storage="fresh" />
          <span>Gekochtes hält 3–4 Tage im Kühlschrank – alles Spätere kommt ins TK oder vom Mini-Prep.</span>
        </p>
      </div>

      {week.prep.warnings.length > 0 && (
        <ul className="space-y-1 border-t border-line/10 px-4 py-3 sm:px-5">
          {week.prep.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-[13px] text-warn">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
