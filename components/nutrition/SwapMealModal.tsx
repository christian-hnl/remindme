'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, BookOpenText, RotateCcw, Search, Snowflake, Star } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatEuro } from '@/lib/format';
import { isSimilar, similarity } from '@/lib/nutrition/macros';
import { MEAL_TYPE_LABELS, type MealType, type NutritionSettingsData, mealTypesForSlot } from '@/lib/nutrition/types';
import type { DayView, MealView, RecipeView, WeekView } from '@/lib/nutrition/views';
import { MacroLine, fmtNum, rangeTone } from './shared';

interface SwapMealModalProps {
  meal: MealView | null;
  day: DayView | null;
  week: WeekView;
  recipes: RecipeView[];
  settings: NutritionSettingsData;
  onClose: () => void;
  onSwap: (payload: { recipeId: string; sauceId?: string | null; batch: boolean }) => Promise<void>;
  onReset: (batch: boolean) => Promise<void>;
  onOpenRecipe: (recipeId: string) => void;
}

/** Replaces one planned meal with a dish of similar macros and cost; the day total updates live. */
export function SwapMealModal({ meal, day, week, recipes, settings, onClose, onSwap, onReset, onOpenRecipe }: SwapMealModalProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [sauceId, setSauceId] = useState<string | null>(null);
  const [batch, setBatch] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!meal) return;
    setQuery('');
    setShowAll(false);
    setPicked(null);
    setSauceId(meal.sauceId);
    // Same dish on other days is one prep batch only when it's cooked in bulk.
    setBatch((recipes.find((r) => r.id === meal.recipeId)?.servings ?? 1) > 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal]);

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const training = !!day?.timing.training;
  const current = meal ? byId.get(meal.recipeId) : null;

  /** Other days with the same dish in this slot – one prep batch. */
  const sameBatch = useMemo(
    () =>
      meal
        ? week.days.flatMap((d) => d.meals.filter((m) => m.slot === meal.slot && m.recipeId === meal.recipeId && m.entryId !== meal.entryId).map(() => d.short))
        : [],
    [meal, week]
  );

  const candidates = useMemo(() => {
    if (!meal || !current || !day) return [];
    const types: MealType[] = meal.slot === 'afternoon' ? (training ? ['preworkout', 'snack'] : ['snack', 'preworkout']) : mealTypesForSlot(meal.slot, training);
    const needle = query.trim().toLowerCase();
    return recipes
      .filter((r) => r.id !== meal.recipeId && types.includes(r.mealType) && (!needle || r.name.toLowerCase().includes(needle)))
      .map((r) => {
        const issues = [...r.issues];
        if (meal.slot === 'lunch' && day.timing.lunchAtSchool && !settings.hasMicrowave && !r.eatCold) issues.push('nicht kalt essbar');
        return { recipe: r, score: similarity(current.nutrition, r.nutrition) + (types[0] === r.mealType ? 0 : 0.8), similar: isSimilar(current.nutrition, r.nutrition), issues };
      })
      .filter((c) => showAll || needle || c.similar)
      .sort((a, b) => a.issues.length - b.issues.length || a.score - b.score);
  }, [meal, current, day, recipes, query, showAll, training, settings.hasMicrowave]);

  const sauces = useMemo(() => recipes.filter((r) => r.mealType === 'sauce'), [recipes]);

  if (!meal || !day) return null;

  const pickedRecipe = picked ? byId.get(picked) ?? null : null;
  const sauce = sauceId ? byId.get(sauceId) : null;
  const mealAfter = pickedRecipe
    ? {
        kcal: pickedRecipe.nutrition.kcal * meal.servings + (pickedRecipe.mealType === 'main' && sauce ? sauce.nutrition.kcal : 0),
        protein: pickedRecipe.nutrition.protein * meal.servings + (pickedRecipe.mealType === 'main' && sauce ? sauce.nutrition.protein : 0),
        fat: pickedRecipe.nutrition.fat * meal.servings + (pickedRecipe.mealType === 'main' && sauce ? sauce.nutrition.fat : 0),
        cost: pickedRecipe.nutrition.cost * meal.servings + (pickedRecipe.mealType === 'main' && sauce ? sauce.nutrition.cost : 0),
      }
    : meal.nutrition;
  const dayAfter = {
    kcal: day.planned.kcal - meal.nutrition.kcal + mealAfter.kcal,
    protein: day.planned.protein - meal.nutrition.protein + mealAfter.protein,
    fat: day.planned.fat - meal.nutrition.fat + mealAfter.fat,
  };

  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    try {
      await fn();
      onClose();
    } catch {
      // toast from the hub
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!meal}
      onClose={onClose}
      size="lg"
      title={`${meal.label} tauschen`}
      subtitle={`${day.long} · ${meal.time} · jetzt: ${meal.name}`}
      icon={<ArrowLeftRight className="h-[18px] w-[18px]" />}
      footer={
        <>
          <button type="button" onClick={() => onOpenRecipe(pickedRecipe?.id ?? meal.recipeId)} className="btn-ghost mr-auto">
            <BookOpenText className="h-4 w-4" /> Rezept
          </button>
          {meal.isSwapped && (
            <button type="button" disabled={saving} onClick={() => run(() => onReset(batch))} className="btn-ghost">
              <RotateCcw className="h-4 w-4" /> Wie geplant
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">
            Abbrechen
          </button>
          <button
            type="button"
            disabled={saving || (!pickedRecipe && sauceId === meal.sauceId)}
            onClick={() => run(() => onSwap({ recipeId: pickedRecipe?.id ?? meal.recipeId, sauceId, batch: batch && sameBatch.length > 0 }))}
            className="btn-primary"
          >
            {saving ? 'Speichert…' : 'Tauschen'}
          </button>
        </>
      }
    >
      {/* Live day total */}
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-[12px] bg-inset p-3 text-center">
        {(
          [
            ['kcal', dayAfter.kcal, settings.kcalTarget - settings.kcalTolerance, settings.kcalTarget + settings.kcalTolerance, ''],
            ['Protein', dayAfter.protein, settings.proteinMin, settings.proteinMax, ' g'],
            ['Fett', dayAfter.fat, settings.fatMin, settings.fatMax, ' g'],
          ] as const
        ).map(([label, value, min, max, unit]) => (
          <div key={label}>
            <p className="eyebrow text-[10px]">{label} am {day.short}</p>
            <p className={`font-mono text-[17px] font-semibold tabular ${rangeTone(value, min, max)}`}>
              {fmtNum(value)}
              {unit}
            </p>
            <p className="font-mono text-[11px] text-ink-3 tabular">
              Ziel {fmtNum(min)}–{fmtNum(max)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Rezept suchen</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen" className="field-input h-10 py-0 pl-9" />
        </label>
        <button type="button" aria-pressed={showAll} onClick={() => setShowAll((v) => !v)} className="tab h-10">
          {showAll ? 'Alle' : 'Nur ähnliche'}
        </button>
      </div>

      <ul className="mt-3 max-h-[42vh] space-y-1.5 overflow-y-auto pr-1">
        {candidates.map(({ recipe, similar, issues }) => {
          const d = recipe.nutrition;
          const diffKcal = d.kcal - (current?.nutrition.kcal ?? 0);
          const diffCost = d.cost - (current?.nutrition.cost ?? 0);
          return (
            <li key={recipe.id}>
              <button
                type="button"
                onClick={() => setPicked(recipe.id === picked ? null : recipe.id)}
                aria-pressed={picked === recipe.id}
                className={`flex w-full items-start gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors ${
                  picked === recipe.id ? 'border-accent bg-accent/10' : 'border-line/10 hover:border-line/25 hover:bg-inset/60'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    {recipe.isFavorite && <Star className="h-3.5 w-3.5 flex-shrink-0 fill-marker text-marker" />}
                    <span className="truncate text-[15px] font-bold text-ink">{recipe.name}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <MacroLine n={d} />
                    {recipe.mealType !== current?.mealType && <span className="chip">{MEAL_TYPE_LABELS[recipe.mealType]}</span>}
                    {recipe.eatCold && meal.slot === 'lunch' && <span className="chip">kalt</span>}
                    {recipe.freezerDays > 0 && recipe.mealType === 'main' && (
                      <span className="chip">
                        <Snowflake className="h-3 w-3" /> TK
                      </span>
                    )}
                    {!similar && <span className="chip text-warn">andere Makros</span>}
                    {issues.map((i) => (
                      <span key={i} className="chip text-pen">
                        {i}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="flex-shrink-0 text-right font-mono text-[12px] tabular">
                  <span className={`block ${Math.abs(diffKcal) > 80 ? 'text-warn' : 'text-ink-3'}`}>
                    {diffKcal >= 0 ? '+' : '−'}
                    {fmtNum(Math.abs(diffKcal))} kcal
                  </span>
                  <span className={`block ${diffCost > 0.3 ? 'text-warn' : diffCost < -0.1 ? 'text-leaf' : 'text-ink-3'}`}>
                    {diffCost >= 0 ? '+' : '−'}
                    {formatEuro(Math.abs(diffCost))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {candidates.length === 0 && (
          <li className="py-6 text-center text-[14px] text-ink-3">
            Nichts mit ähnlichen Makros.{' '}
            <button type="button" onClick={() => setShowAll(true)} className="font-bold text-accent">
              Alle zeigen
            </button>
          </li>
        )}
      </ul>

      {(pickedRecipe?.mealType ?? current?.mealType) === 'main' && (
        <div className="mt-4">
          <label htmlFor="swap-sauce" className="field-label">
            Sauce
          </label>
          <select id="swap-sauce" value={sauceId ?? ''} onChange={(e) => setSauceId(e.target.value || null)} className="field-input">
            <option value="">Ohne Sauce</option>
            {sauces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {fmtNum(s.nutrition.kcal)} kcal
              </option>
            ))}
          </select>
        </div>
      )}

      {sameBatch.length > 0 && (
        <label className="mt-4 flex items-start gap-3 rounded-[10px] bg-inset p-3 text-[14px]">
          <input type="checkbox" checked={batch} onChange={(e) => setBatch(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]" />
          <span>
            <span className="font-bold text-ink">Auch am {sameBatch.join(', ')} tauschen</span>
            <span className="block text-ink-3">Gleiches Gericht, gleiche Prep-Portion – so bleibt es eine Charge.</span>
          </span>
        </label>
      )}
    </Modal>
  );
}
