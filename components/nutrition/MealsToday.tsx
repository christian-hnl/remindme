'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, BookOpenText, CircleSlash, Dumbbell, Moon, MoreHorizontal, PartyPopper, Plus, Undo2 } from 'lucide-react';
import { CheckButton } from '@/components/ui/CheckButton';
import { trainingHint } from '@/lib/nutrition/timing';
import { PRODUCE_TARGET, mealTypesForSlot, type MealSlot, type NutritionSettingsData } from '@/lib/nutrition/types';
import type { DayView, MealLogView, MealView, RecipeView } from '@/lib/nutrition/views';
import { LogMealModal, type LogPayload } from './LogMealModal';
import { MacroLine, TargetRing, TreatChip, fmtNum, rangeTone } from './shared';

interface MealsTodayProps {
  day: DayView;
  settings: NutritionSettingsData;
  recipes: RecipeView[];
  onLog: (slot: MealSlot | 'extra', status: 'eaten' | 'skipped', payload?: LogPayload) => Promise<void>;
  onUndo: (log: MealLogView) => void;
  onOpenRecipe: (recipeId: string, portions?: number) => void;
}

const STATUS_LABEL = { eaten: 'gegessen', swapped: 'getauscht', skipped: 'ausgelassen' } as const;

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function MealsToday({ day, settings, recipes, onLog, onUndo, onOpenRecipe }: MealsTodayProps) {
  const [menu, setMenu] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<MealView | 'extra' | null>(null);
  // The clock moves on while the tab is open – the "next" meal follows it.
  const [clock, setClock] = useState(nowTime);
  useEffect(() => {
    const timer = setInterval(() => setClock(nowTime()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const hint = trainingHint(day.timing);
  const open = day.meals.filter((m) => !m.log);
  const next = open.find((m) => m.time >= clock) ?? open[0] ?? null;
  const allDone = day.meals.length > 0 && open.length === 0;
  const proteinReached = day.eaten.protein >= settings.proteinMin;

  return (
    <section className="card" aria-label="Essen heute">
      <div className="p-4 pb-2 sm:p-5 sm:pb-2">
        <p className="eyebrow">
          {day.long}, {day.date.slice(8)}.{day.date.slice(5, 7)}.
        </p>
        <h2 className="card-title mt-1">Heute</h2>
        <p className={`mt-2 flex items-start gap-2 text-[14px] font-bold ${day.timing.training ? 'text-accent' : 'text-ink-2'}`}>
          {day.timing.training ? <Dumbbell className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <Moon className="mt-0.5 h-4 w-4 flex-shrink-0" />}
          {hint}
        </p>
        {day.timing.notes
          .filter((n) => !n.includes('Training'))
          .map((note) => (
            <p key={note} className="mt-1 text-[13px] text-ink-3">
              {note}
            </p>
          ))}
      </div>

      <div className="flex items-start justify-around gap-1 px-2 py-3 sm:px-5">
        <TargetRing value={day.eaten.kcal} target={settings.kcalTarget} label="kcal" unit="kcal" size={92} />
        <TargetRing value={day.eaten.protein} target={settings.proteinMin} label="Protein" unit="g" tone="leaf" size={92} />
        <TargetRing value={day.produce.eaten} target={PRODUCE_TARGET} label="Obst & Gemüse" unit="g" tone="leaf" size={92} />
      </div>
      <p className="px-4 text-center text-[12px] text-ink-3 sm:px-5">
        Noch offen: <span className="font-mono tabular">{fmtNum(Math.max(0, settings.kcalTarget - day.eaten.kcal))} kcal</span> ·{' '}
        <span className="font-mono tabular">{fmtNum(Math.max(0, settings.proteinMin - day.eaten.protein))} g Protein</span>{' '}
        <span className="whitespace-nowrap">
          · Fett bisher{' '}
          <span className={`font-mono tabular ${rangeTone(day.eaten.fat, 0, settings.fatMax)}`}>
            {fmtNum(day.eaten.fat)}/{fmtNum(settings.fatMax)} g
          </span>
        </span>
      </p>

      {allDone && (
        <p className="mx-4 mt-3 flex items-start gap-2 rounded-[12px] bg-leaf/10 px-3 py-2.5 text-[14px] font-bold text-leaf sm:mx-5">
          <PartyPopper className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {proteinReached ? 'Alles abgehakt und Proteinziel erreicht – stark!' : 'Alles abgehakt. Fürs Proteinziel fehlt noch etwas – ein Skyr oder Topfen hilft.'}
        </p>
      )}

      <ul className="mt-1 divide-y divide-line/10 px-4 sm:px-5">
        {day.meals.map((m) => {
          const log = m.log;
          const isNext = next?.entryId === m.entryId;
          return (
            <li key={m.entryId} className={`relative flex items-start gap-3 py-3 ${isNext ? 'before:absolute before:-left-4 before:bottom-2 before:top-2 before:w-[3px] before:rounded-r-full before:bg-accent sm:before:-left-5' : ''}`}>
              <span className={`w-12 flex-shrink-0 pt-0.5 font-mono text-[13px] font-medium tabular ${isNext ? 'text-accent' : 'text-ink-2'}`}>{m.time}</span>
              <button type="button" onClick={() => onOpenRecipe(log?.status === 'swapped' && log.recipeId ? log.recipeId : m.recipeId, 1)} className="min-w-0 flex-1 text-left" title="Rezept ansehen">
                <span className="eyebrow flex items-center gap-1.5 text-[11px]">
                  {m.label}
                  {isNext && <span className="rounded bg-accent/15 px-1 text-[10px] tracking-[0.08em] text-accent">als Nächstes</span>}
                </span>
                {m.isTreat && <TreatChip className="mb-0.5 mt-0.5" />}
                <span className={`block text-[15px] font-bold leading-snug ${log?.status === 'skipped' ? 'text-ink-3 line-through' : 'text-ink'}`}>
                  {log?.status === 'swapped' ? log.label : m.name}
                  <BookOpenText className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-ink-3" aria-hidden />
                </span>
                {m.sauceName && log?.status !== 'swapped' && <span className="block text-[12px] text-ink-3">+ {m.sauceName}</span>}
                {log?.status === 'swapped' && <span className="block text-[12px] text-ink-3 line-through">{m.name}</span>}
                <MacroLine n={log && log.status !== 'skipped' ? log : m.nutrition} cost={false} />
                {log && (
                  <span className={`chip mt-1.5 ${log.status === 'skipped' ? '' : 'border-leaf/30 text-leaf'}`}>
                    {log.status === 'swapped' ? <ArrowLeftRight className="h-3 w-3" /> : log.status === 'skipped' ? <CircleSlash className="h-3 w-3" /> : null}
                    {STATUS_LABEL[log.status]}
                  </span>
                )}
              </button>
              {log ? (
                <button type="button" onClick={() => onUndo(log)} className="icon-btn h-9 w-9" aria-label={`${m.label} wieder öffnen`} title="Rückgängig">
                  <Undo2 className="h-4 w-4" />
                </button>
              ) : (
                <div className="relative flex flex-shrink-0 items-center gap-1">
                  <CheckButton checked={false} onChange={() => onLog(m.slot, 'eaten')} label={`${m.label} gegessen`} className="mr-1" />
                  <button
                    type="button"
                    onClick={() => setMenu(menu === m.entryId ? null : m.entryId)}
                    className="icon-btn h-9 w-9"
                    aria-label={`Weitere Optionen für ${m.label}`}
                    aria-expanded={menu === m.entryId}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menu === m.entryId && (
                    <>
                      <button type="button" aria-label="Menü schließen" onClick={() => setMenu(null)} className="fixed inset-0 z-10 cursor-default" />
                      <div className="animate-in absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-[12px] border border-line/10 bg-sheet py-1 shadow-lift">
                        <button
                          type="button"
                          onClick={() => {
                            setMenu(null);
                            setSwapFor(m);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] font-bold text-ink hover:bg-inset"
                        >
                          <ArrowLeftRight className="h-4 w-4 text-ink-3" /> Etwas anderes gegessen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenu(null);
                            onLog(m.slot, 'skipped');
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] font-bold text-ink hover:bg-inset"
                        >
                          <CircleSlash className="h-4 w-4 text-ink-3" /> Ausgelassen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {day.extras.length > 0 && (
        <ul className="mx-4 border-t border-line/10 py-2 sm:mx-5">
          {day.extras.map((x) => (
            <li key={x.id} className="flex items-center gap-3 py-1.5">
              <Plus className="h-3.5 w-3.5 flex-shrink-0 text-ink-3" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{x.label}</span>
              <MacroLine n={x} cost={false} />
              <button type="button" onClick={() => onUndo(x)} className="icon-btn h-8 w-8" aria-label={`${x.label} entfernen`}>
                <Undo2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line/10 p-3 sm:px-5">
        <button type="button" onClick={() => setSwapFor('extra')} className="btn-ghost h-9 w-full justify-start px-2 text-[14px]">
          <Plus className="h-4 w-4" /> Snack oder Extra eintragen
        </button>
      </div>

      <LogMealModal
        isOpen={!!swapFor}
        onClose={() => setSwapFor(null)}
        title={swapFor === 'extra' ? 'Extra eintragen' : 'Etwas anderes gegessen'}
        subtitle={swapFor && swapFor !== 'extra' ? `statt ${swapFor.name}` : 'kommt zum Tag dazu'}
        recipes={recipes}
        preferred={swapFor && swapFor !== 'extra' ? mealTypesForSlot(swapFor.slot, !!day.timing.training) : ['snack', 'preworkout']}
        onSubmit={(payload) => (swapFor === 'extra' ? onLog('extra', 'eaten', payload) : onLog((swapFor as MealView).slot, 'eaten', payload))}
      />
    </section>
  );
}
