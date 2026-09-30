'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, ChefHat, Dumbbell, Snowflake, Sparkles, Utensils } from 'lucide-react';
import { formatEuro } from '@/lib/format';
import { STRATEGY_LABELS, TRAINING_SHORT, TREAT_EXTRA_KCAL, type NutritionSettingsData } from '@/lib/nutrition/types';
import type { DayView, MealView, TemplateSummary, WeekView } from '@/lib/nutrition/views';
import { MacroLine, TreatChip, fmtNum, rangeTone } from './shared';

interface WeekPlanProps {
  week: WeekView;
  templates: TemplateSummary[];
  settings: NutritionSettingsData;
  onPickMeal: (meal: MealView, day: DayView) => void;
  onChooseTemplate: (template: TemplateSummary) => void;
  /** Whole week to "Einfach" (Huhn mit Reis & Co.) or back to the recipes. */
  onSetSimple: (simple: boolean) => void;
}

function DayTotals({ day, settings, className = '' }: { day: DayView; settings: NutritionSettingsData; className?: string }) {
  const p = day.planned;
  // The Gönn-Tag may go a little over – that's the point of it.
  const extra = day.treat ? TREAT_EXTRA_KCAL : 0;
  return (
    <span className={`font-mono text-[12px] tabular ${className}`}>
      <span className={rangeTone(p.kcal, settings.kcalTarget - settings.kcalTolerance, settings.kcalTarget + settings.kcalTolerance + extra)}>{fmtNum(p.kcal)} kcal</span>
      {' · '}
      <span className={rangeTone(p.protein, settings.proteinMin, settings.proteinMax + (day.treat ? 15 : 0))}>{fmtNum(p.protein)} P</span>
      {' · '}
      <span className={rangeTone(p.fat, settings.fatMin, settings.fatMax + (day.treat ? 15 : 0))}>{fmtNum(p.fat)} F</span>
    </span>
  );
}

function MealBadges({ meal }: { meal: MealView }) {
  return (
    <>
      {meal.isTreat && <TreatChip />}
      {meal.isSwapped && (
        <span className="chip" title="Von dir getauscht">
          <ArrowLeftRight className="h-3 w-3" />
        </span>
      )}
      {meal.adapted && (
        <span className="chip text-accent" title={`Statt ${meal.adapted.from}: ${meal.adapted.reason}`}>
          <Sparkles className="h-3 w-3" /> angepasst
        </span>
      )}
      {meal.storage === 'freezer' && (
        <span className="chip" title="Aus dem Tiefkühlfach – am Vorabend auftauen">
          <Snowflake className="h-3 w-3" />
        </span>
      )}
      {meal.servings !== 1 && <span className="chip font-mono">×{meal.servings.toLocaleString('de-DE')}</span>}
      {meal.issues.length > 0 && (
        <span className="chip text-pen" title={meal.issues.join(', ')}>
          <AlertTriangle className="h-3 w-3" />
        </span>
      )}
    </>
  );
}

export function WeekPlan({ week, templates, settings, onPickMeal, onChooseTemplate, onSetSimple }: WeekPlanProps) {
  const todayIndex = week.days.findIndex((d) => d.isToday);
  const [selected, setSelected] = useState(Math.max(0, todayIndex));
  useEffect(() => setSelected(Math.max(0, week.days.findIndex((d) => d.isToday))), [week.weekStart, week.days]);
  const day = week.days[selected];
  const slots = week.days[0]?.meals.map((m) => m.slot) ?? [];

  return (
    <section className="card" aria-label="Wochenplan">
      <div className="p-4 pb-3 sm:p-5 sm:pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Woche {week.label}</p>
            <h2 className="card-title mt-1">Wochenplan</h2>
            {week.template && (
              <p className="mt-1 text-[13px] text-ink-3">
                {week.template.theme} · Saucen-Basis {week.template.sauceBase} · {STRATEGY_LABELS[week.template.strategy]}
              </p>
            )}
          </div>
          <div className="segmented grid-cols-4" role="group" aria-label="Rotationswoche">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={week.template?.id === t.id}
                onClick={() => week.template?.id !== t.id && onChooseTemplate(t)}
                className="segmented-item min-h-[34px] px-3 text-[13px]"
                title={`Woche ${t.number}: ${t.name} – ${t.theme}`}
              >
                <span className="font-mono">{t.number}</span>
                <span className="hidden sm:inline">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="segmented grid-cols-2 self-start sm:self-auto" role="group" aria-label="Kochmodus der Woche">
            <button type="button" aria-pressed={!week.simple} onClick={() => week.simple && onSetSimple(false)} className="segmented-item min-h-[34px] px-3 text-[13px]">
              <ChefHat className="h-4 w-4" /> Rezepte
            </button>
            <button type="button" aria-pressed={week.simple} onClick={() => !week.simple && onSetSimple(true)} className="segmented-item min-h-[34px] px-3 text-[13px]">
              <Utensils className="h-4 w-4" /> Einfach
            </button>
          </div>
          <p className="min-w-0 text-[12px] leading-snug text-ink-3 sm:flex-1">
            {week.simple
              ? 'Einfach-Woche: Huhn mit Reis & Co. statt Rezepten – gleiche Makros, Einkauf und Prep sind angepasst. Saucen und Gönn-Essen bleiben.'
              : 'Volle Rotation mit allen Rezepten. „Einfach“ stellt die ganze Woche auf schnelle Gerichte wie Huhn mit Reis um – Einkauf und Prep passen sich an.'}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          <span className="text-ink-2">
            Ø pro Tag <MacroLine n={week.average} cost={false} className="text-ink-2" />
          </span>
          <span className="text-ink-2">
            Einkauf <span className={`font-mono tabular ${week.budget.over > 0 ? 'text-warn' : 'text-leaf'}`}>{formatEuro(week.budget.used)}</span>
            <span className="text-ink-3"> / {formatEuro(week.budget.limit, 0)} Budget</span>
          </span>
        </div>
      </div>

      {/* Phones: one day at a time */}
      <div className="md:hidden">
        <div className="scrollbar-none flex gap-1 overflow-x-auto px-4 pb-2" role="tablist" aria-label="Tag">
          {week.days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={selected === i}
              onClick={() => setSelected(i)}
              className="tab relative h-12 flex-col gap-0 px-3 leading-tight"
            >
              <span>{d.short}</span>
              <span className="text-[10px] font-medium opacity-70">{d.training === 'rest' ? '·' : TRAINING_SHORT[d.training]}</span>
              {d.isToday && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-marker" aria-hidden />}
            </button>
          ))}
        </div>
        {day && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-ink-2">
                {day.timing.training && <Dumbbell className="h-3.5 w-3.5 text-accent" />}
                {day.long}
                {!day.shopped && <span className="chip">zuhause</span>}
              </span>
              <DayTotals day={day} settings={settings} />
            </div>
            <ul className="space-y-1.5">
              {day.meals.map((m) => (
                <li key={m.entryId}>
                  <button type="button" onClick={() => onPickMeal(m, day)} className="flex w-full items-start gap-3 rounded-[12px] border border-line/10 px-3 py-2.5 text-left hover:bg-inset/60">
                    <span className="w-11 flex-shrink-0 pt-0.5 font-mono text-[12px] text-ink-3 tabular">{m.time}</span>
                    <span className="min-w-0 flex-1">
                      <span className="eyebrow block text-[10px]">{m.label}</span>
                      <span className="block text-[15px] font-bold leading-snug text-ink">{m.name}</span>
                      {m.sauceName && <span className="block text-[12px] text-ink-3">+ {m.sauceName}</span>}
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        <MacroLine n={m.nutrition} />
                        <MealBadges meal={m} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tablets and up: the whole week as a grid */}
      <div className="hidden overflow-x-auto px-5 pb-5 md:block">
        <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-24" />
              {week.days.map((d) => (
                <th key={d.date} className={`rounded-[10px] px-2 py-1.5 text-left align-top ${d.isToday ? 'bg-marker/25' : ''}`}>
                  <span className="flex items-center gap-1 font-display text-[14px] font-semibold text-ink">
                    {d.short}
                    {d.timing.training && (
                      <span className="chip ml-auto">
                        <Dumbbell className="h-3 w-3" /> {TRAINING_SHORT[d.training]}
                      </span>
                    )}
                    {!d.shopped && <span className="chip ml-auto">zuhause</span>}
                  </span>
                  <DayTotals day={d} settings={settings} className="block font-normal" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot}>
                <th className="pr-1 text-left align-top">
                  <span className="eyebrow text-[10px]">{week.days[0].meals.find((m) => m.slot === slot)?.label.replace('Pre-Workout', 'Nachmittag')}</span>
                </th>
                {week.days.map((d) => {
                  const m = d.meals.find((x) => x.slot === slot);
                  if (!m) return <td key={d.date} />;
                  return (
                    <td key={d.date} className="align-top">
                      <button
                        type="button"
                        onClick={() => onPickMeal(m, d)}
                        className={`flex h-full min-h-[92px] w-full flex-col rounded-[10px] border px-2 py-1.5 text-left transition-colors hover:border-accent/50 hover:bg-inset/60 ${
                          m.log ? 'border-leaf/30 bg-leaf/5' : 'border-line/10'
                        }`}
                        title={`${m.label} ${m.time}: ${m.name}`}
                      >
                        <span className="font-mono text-[10px] text-ink-3 tabular">
                          {m.time}
                          {slot === 'afternoon' && ` · ${m.label}`}
                        </span>
                        <span className="line-clamp-2 text-[13px] font-bold leading-snug text-ink">{m.name}</span>
                        <span className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                          <span className="font-mono text-[11px] text-ink-3 tabular">
                            {fmtNum(m.nutrition.kcal)} · {fmtNum(m.nutrition.protein)}P
                          </span>
                          <MealBadges meal={m} />
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {week.warnings.length > 0 && (
        <ul className="space-y-1 border-t border-line/10 px-4 py-3 sm:px-5">
          {week.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-[13px] text-warn">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
