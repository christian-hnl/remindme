'use client';

import React from 'react';
import { ArrowRight, Check, Dumbbell } from 'lucide-react';
import { Progress } from '@/components/wealth/charts';
import type { NutritionToday } from '@/types';
import { fmtNum } from './shared';

interface MealsTodayCardProps {
  nutrition: NutritionToday | null;
  onEatNext: (entry: NonNullable<NutritionToday['next']>) => void;
  onOpen: () => void;
}

/** "Essen heute" on the start screen: next meal, protein so far, one tap to tick it off. */
export function MealsTodayCard({ nutrition, onEatNext, onOpen }: MealsTodayCardProps) {
  if (!nutrition) {
    return (
      <section className="card card-pad" aria-label="Essen heute">
        <p className="eyebrow">Essen heute</p>
        <h2 className="card-title mt-1">Meal Prep</h2>
        <p className="mt-2 text-[14px] text-ink-2">Wochenplan, Einkaufsliste und Proteinziel – die Uhrzeiten kommen aus deinem Stundenplan.</p>
        <button type="button" onClick={onOpen} className="btn-secondary mt-3">
          Einrichten <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    );
  }

  const { next, eaten, targets } = nutrition;
  const done = nutrition.meals.filter((m) => m.status).length;

  return (
    <section className="card" aria-label="Essen heute">
      <button type="button" onClick={onOpen} className="block w-full p-4 pb-2 text-left sm:p-5 sm:pb-2">
        <p className="eyebrow">Essen heute</p>
        {next ? (
          <>
            <h2 className="card-title mt-1">
              {next.label} <span className="font-mono text-[18px] font-medium text-ink-2">{next.time}</span>
            </h2>
            <p className="mt-1 text-[15px] font-bold text-ink">{next.name}</p>
          </>
        ) : (
          <h2 className="card-title mt-1">Alles gegessen</h2>
        )}
        <p className={`mt-1.5 flex items-center gap-1.5 text-[13px] ${nutrition.training === 'rest' ? 'text-ink-3' : 'font-bold text-accent'}`}>
          {nutrition.training !== 'rest' && <Dumbbell className="h-3.5 w-3.5" />}
          {nutrition.hint}
        </p>
      </button>

      <div className="px-4 pb-3 sm:px-5">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-bold text-ink-2">Protein</span>
          <span className="font-mono text-ink tabular">
            {fmtNum(eaten.protein)} <span className="text-ink-3">/ {targets.proteinMin} g</span>
          </span>
        </div>
        <Progress value={eaten.protein / targets.proteinMin} tone={eaten.protein >= targets.proteinMin ? 'leaf' : 'accent'} className="mt-1" />
        <div className="mt-2 flex items-baseline justify-between text-[13px]">
          <span className="font-bold text-ink-2">kcal</span>
          <span className="font-mono text-ink tabular">
            {fmtNum(eaten.kcal)} <span className="text-ink-3">/ {fmtNum(targets.kcal)}</span>
          </span>
        </div>
        <Progress value={eaten.kcal / targets.kcal} className="mt-1" />
      </div>

      <ul className="flex gap-1 px-4 pb-3 sm:px-5" aria-label={`${done} von ${nutrition.meals.length} Mahlzeiten abgehakt`}>
        {nutrition.meals.map((m) => (
          <li key={m.entryId} className="min-w-0 flex-1" title={`${m.label} ${m.time}: ${m.name}`}>
            <span
              className={`flex h-7 items-center justify-center rounded-[8px] font-mono text-[10px] tabular ${
                m.status === 'skipped' ? 'bg-inset text-ink-3 line-through' : m.status ? 'bg-leaf/15 text-leaf' : m.entryId === next?.entryId ? 'bg-accent/15 text-accent' : 'bg-inset text-ink-3'
              }`}
            >
              {m.status && m.status !== 'skipped' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : m.time}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 border-t border-line/10 p-3 sm:px-5">
        {next && (
          <button type="button" onClick={() => onEatNext(next)} className="btn-primary h-9 px-3 text-[13px]">
            <Check className="h-4 w-4" strokeWidth={3} /> {next.label} gegessen
          </button>
        )}
        <button type="button" onClick={onOpen} className="btn-ghost ml-auto h-9 px-2 text-[13px]">
          Ernährung <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
