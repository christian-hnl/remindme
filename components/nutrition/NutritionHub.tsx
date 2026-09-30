'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, PartyPopper, Printer, ShoppingBasket, X } from 'lucide-react';
import { Section, useSectionFocus } from '@/components/layout/SectionFocus';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/client';
import { fireMilestoneGlow } from '@/lib/confetti';
import { shiftWeek, weekStartOf } from '@/lib/nutrition/dates';
import type { BudgetSuggestion } from '@/lib/nutrition/plan';
import type { MealSlot } from '@/lib/nutrition/types';
import type { DayView, MealLogView, MealView, NutritionSummary, RecipeView, TemplateSummary, WeekView } from '@/lib/nutrition/views';
import type { LogPayload } from './LogMealModal';
import { MealsToday } from './MealsToday';
import { NutritionStats } from './NutritionStats';
import { PrepPlan } from './PrepPlan';
import { RecipeBrowser } from './RecipeBrowser';
import { RecipeDetailModal } from './RecipeDetailModal';
import { RecipeEditorModal, type RecipeDraft } from './RecipeEditorModal';
import { ShoppingPlan } from './ShoppingPlan';
import { SwapMealModal } from './SwapMealModal';
import { WeekPlan } from './WeekPlan';

interface NutritionHubProps {
  /** Something changed that the rest of the dashboard shows (reminders, habits, shopping list). */
  onChanged: () => void;
  onOpenShoppingList: () => void;
  onOpenSettings: () => void;
  createRecipeRequest?: boolean;
  onCreateRecipeHandled?: () => void;
}

interface ShoppingSync {
  created: number;
  updated: number;
  removed: number;
}

/** " · Einkaufsliste angepasst (+2, −5)" when a plan change touched the already exported list. */
const shoppingNote = (s?: ShoppingSync | null) => {
  if (!s || s.created + s.updated + s.removed === 0) return '';
  const parts = [s.created && `${s.created} neu`, s.removed && `${s.removed} entfernt`, s.updated && `${s.updated} geändert`].filter(Boolean);
  return ` · Einkaufsliste angepasst: ${parts.join(', ')}`;
};

interface LogResult {
  log: MealLogView;
  day: { protein: number; complete: boolean; proteinReached: boolean };
  weekGoal: { proteinDays: number; target: number; reached: boolean; celebrate: boolean };
}

const INTRO_KEY = 'lifetracker:nutrition-intro';

/** Celebrates the week goal the same way savings goals do. */
function celebrate() {
  fireMilestoneGlow();
  setTimeout(fireMilestoneGlow, 450);
}

/** First visit: three sentences on how the plan works, then out of the way for good. */
function IntroCard({ onOpenSettings, onDismiss }: { onOpenSettings: () => void; onDismiss: () => void }) {
  const points = [
    { Icon: CalendarClock, text: 'Die Uhrzeiten kommen aus deinem Stundenplan: Jause in der großen Pause, Mittag in der Mittagspause, Pre-Workout eine Stunde vor dem Training. Entfall verschiebt alles mit.' },
    { Icon: ShoppingBasket, text: 'Samstag einkaufen (ein Klick schiebt alles in die Einkaufsliste), Sonntag rund zwei Stunden vorkochen – Donnerstag und Freitag kommen aus dem Tiefkühlfach oder vom Mini-Prep am Mittwoch.' },
    { Icon: PartyPopper, text: 'Jeden Samstag gibt es ein Gönn-Essen. Mahlzeiten abhaken reicht – Proteinziel, Routinen und Statistik laufen von selbst.' },
  ];
  return (
    <section className="card card-pad relative mb-4 sm:mb-6" aria-label="So funktioniert's">
      <button type="button" onClick={onDismiss} className="icon-btn absolute right-2 top-2 h-9 w-9" aria-label="Hinweis schließen">
        <X className="h-4 w-4" />
      </button>
      <p className="eyebrow">Neu hier?</p>
      <h2 className="card-title mt-1">So funktioniert dein Meal Prep</h2>
      <ul className="mt-3 space-y-2.5">
        {points.map(({ Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-2">
            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-inset text-accent">
              <Icon className="h-4 w-4" />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onDismiss} className="btn-primary">
          Los geht&apos;s
        </button>
        <button type="button" onClick={onOpenSettings} className="btn-secondary">
          Trainingstage & Budget prüfen
        </button>
      </div>
    </section>
  );
}

export function NutritionHub({ onChanged, onOpenShoppingList, onOpenSettings, createRecipeRequest, onCreateRecipeHandled }: NutritionHubProps) {
  const toast = useToast();
  const { focusId, phase } = useSectionFocus();
  const thisWeek = weekStartOf(new Date());
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [data, setData] = useState<NutritionSummary | null>(null);
  /** The current week, for "Heute", when another week is being browsed. */
  const [current, setCurrent] = useState<WeekView | null>(null);
  const hasCurrent = useRef(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [swap, setSwap] = useState<{ meal: MealView; day: DayView } | null>(null);
  const [detail, setDetail] = useState<{ id: string; portions?: number; context?: string } | null>(null);
  const [editor, setEditor] = useState<{ base: RecipeView | null; asCopy: boolean } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    try {
      setShowIntro(localStorage.getItem(INTRO_KEY) !== 'done');
    } catch {
      // Storage unavailable – no intro then.
    }
  }, []);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    try {
      localStorage.setItem(INTRO_KEY, 'done');
    } catch {
      // ignore
    }
  }, []);

  const loadCurrent = useCallback(async () => {
    const summary = await api<NutritionSummary>(`/api/v1/nutrition/summary?week=${thisWeek}`);
    setCurrent(summary.week);
    hasCurrent.current = true;
  }, [thisWeek]);

  const load = useCallback(
    async (week: string) => {
      setLoading(true);
      try {
        const summary = await api<NutritionSummary>(`/api/v1/nutrition/summary?week=${week}`);
        setData(summary);
        if (week === thisWeek) {
          setCurrent(summary.week);
          hasCurrent.current = true;
        } else if (!hasCurrent.current) {
          await loadCurrent();
        }
      } catch (error) {
        toast(`Ernährungsplan: ${errorMessage(error)}`, 'error');
      } finally {
        setLoading(false);
      }
    },
    [toast, thisWeek, loadCurrent]
  );

  useEffect(() => {
    load(weekStart);
  }, [load, weekStart]);

  useEffect(() => {
    if (!createRecipeRequest) return;
    setEditor({ base: null, asCopy: false });
    onCreateRecipeHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRecipeRequest]);

  /** Reload after a change; the current week too when something else is browsed. */
  const reload = useCallback(async () => {
    setVersion((v) => v + 1);
    await load(weekStart);
    if (weekStart !== thisWeek) {
      try {
        await loadCurrent();
      } catch {
        // the main load already reported
      }
    }
    onChanged();
  }, [load, loadCurrent, weekStart, thisWeek, onChanged]);

  const run = useCallback(
    async <T,>(request: () => Promise<T>, success?: (result: T) => string | null, failure = 'Hat nicht geklappt') => {
      try {
        const result = await request();
        const message = success?.(result);
        if (message) toast(message);
        await reload();
        return result;
      } catch (error) {
        toast(`${failure}: ${errorMessage(error)}`, 'error');
        throw error;
      }
    },
    [toast, reload]
  );

  // ---------------------------------------------------------------- actions
  const today = current?.days.find((d) => d.isToday) ?? null;

  const logMeal = useCallback(
    async (slot: MealSlot | 'extra', status: 'eaten' | 'skipped', payload?: LogPayload) => {
      if (!today) return;
      const result = await run(
        () => api<LogResult>('/api/v1/nutrition/logs', { body: { day: today.date, slot, status, ...payload } }),
        undefined,
        'Konnte nicht abgehakt werden'
      );
      if (status === 'eaten') fireMilestoneGlow();
      if (result.weekGoal.celebrate) {
        celebrate();
        toast(`🎉 Wochenziel geschafft – Protein an ${result.weekGoal.proteinDays} Tagen!`);
      } else if (result.day.proteinReached && status === 'eaten') {
        toast(`Proteinziel erreicht: ${result.day.protein.toLocaleString('de-DE')} g`);
      }
    },
    [today, run, toast]
  );

  const undo = useCallback(
    (log: MealLogView) => run(() => api(`/api/v1/nutrition/logs/${log.id}`, { method: 'DELETE' }), () => 'Rückgängig gemacht', 'Konnte nicht zurückgenommen werden').catch(() => {}),
    [run]
  );

  const chooseTemplate = useCallback(
    (template: TemplateSummary) => {
      if (!data) return;
      const week = data.week;
      const swapped = week.days.some((d) => d.meals.some((m) => m.isSwapped));
      const started = week.weekStart <= thisWeek || week.days.some((d) => d.meals.some((m) => m.log)) || week.prep.sessions.some((s) => s.steps.some((st) => st.done));
      // A plan that's already running (or has your swaps) shouldn't change on a stray tap.
      if (
        (swapped || started) &&
        !window.confirm(
          `Diese Woche auf Woche ${template.number} (${template.name}) umstellen? Der Plan wird ersetzt${swapped ? ', deine Tausche gehen verloren' : ''}${
            started ? ' – eingekauft und vorgekocht ist dafür aber noch nichts' : ''
          }.`
        )
      )
        return;
      run(
        () => api<{ shopping: ShoppingSync | null }>(`/api/v1/nutrition/weeks/${week.weekStart}`, { method: 'PUT', body: { templateId: template.id } }),
        (r) => `Woche ${template.number} – ${template.name} gewählt${shoppingNote(r.shopping)}`,
        'Rotationswoche konnte nicht gewählt werden'
      ).catch(() => {});
    },
    [data, run, thisWeek]
  );

  const setWeekMode = useCallback(
    (simple: boolean) => {
      if (!data) return;
      const week = data.week;
      const prepped = week.prep.sessions.some((s) => s.steps.some((st) => st.done));
      if (prepped && !window.confirm('Für diese Woche ist schon vorgekocht. Trotzdem die ganze Woche umstellen?')) return;
      run(
        () => api<{ shopping: ShoppingSync | null }>(`/api/v1/nutrition/weeks/${week.weekStart}`, { method: 'PATCH', body: { simple } }),
        (r) => `${simple ? 'Einfach-Woche: Huhn mit Reis & Co.' : 'Wieder mit Rezepten'}${shoppingNote(r.shopping)}`,
        'Modus konnte nicht gewechselt werden'
      ).catch(() => {});
    },
    [data, run]
  );

  const swapMeal = useCallback(
    async (entryId: string, payload: { recipeId: string; sauceId?: string | null; batch: boolean } | { reset: true; batch: boolean }) => {
      if (!data) return;
      await run(
        () => api<{ count: number; shopping: ShoppingSync | null }>(`/api/v1/nutrition/weeks/${data.week.weekStart}/entries/${entryId}`, { method: 'PATCH', body: payload }),
        (r) => `${'reset' in payload ? 'Wieder wie geplant' : r.count > 1 ? `An ${r.count} Tagen getauscht` : 'Getauscht'}${shoppingNote(r.shopping)}`,
        'Konnte nicht getauscht werden'
      );
    },
    [data, run]
  );

  const applySuggestion = useCallback(
    (s: BudgetSuggestion) => swapMeal(s.entryIds[0], { recipeId: s.toRecipeId, batch: true }).catch(() => {}),
    [swapMeal]
  );

  const toggleStep = useCallback(
    async (stepId: string, done: boolean) => {
      if (!data) return;
      // Optimistic tick – the timeline and checklist react right away.
      setData((d) =>
        d && {
          ...d,
          week: {
            ...d.week,
            prep: { ...d.week.prep, sessions: d.week.prep.sessions.map((s) => ({ ...s, steps: s.steps.map((st) => (st.id === stepId ? { ...st, done } : st)) })) },
          },
        }
      );
      try {
        const result = await api<{ finished: string | null }>(`/api/v1/nutrition/weeks/${data.week.weekStart}/prep`, { method: 'PATCH', body: { stepId, done } });
        if (result.finished) {
          celebrate();
          toast(`${result.finished} erledigt – als Routine abgehakt 🥡`);
        }
        await reload();
      } catch (error) {
        toast(`Schritt: ${errorMessage(error)}`, 'error');
        reload();
      }
    },
    [data, reload, toast]
  );

  const exportShopping = useCallback(
    async (includePantry: boolean) => {
      if (!data) return;
      setExporting(true);
      try {
        await run(
          () => api<ShoppingSync>('/api/v1/nutrition/shopping', { body: { weekStart: data.week.weekStart, includePantry } }),
          (r) =>
            `${r.created} Artikel in die Einkaufsliste übernommen${r.updated ? `, ${r.updated} aktualisiert` : ''}${r.removed ? `, ${r.removed} nicht mehr nötig entfernt` : ''}`,
          'Einkaufsliste'
        );
      } catch {
        // toast shown
      } finally {
        setExporting(false);
      }
    },
    [data, run]
  );

  const toggleFavorite = useCallback(
    (recipe: RecipeView) => {
      setData((d) => d && { ...d, recipes: d.recipes.map((r) => (r.id === recipe.id ? { ...r, isFavorite: !r.isFavorite } : r)) });
      api(`/api/v1/nutrition/recipes/${recipe.id}`, { method: 'PATCH', body: { favorite: !recipe.isFavorite } }).catch((error) => {
        toast(errorMessage(error), 'error');
        reload();
      });
    },
    [toast, reload]
  );

  const saveRecipe = useCallback(
    async (draft: RecipeDraft, id?: string) => {
      await run(
        () => api(id ? `/api/v1/nutrition/recipes/${id}` : '/api/v1/nutrition/recipes', { method: id ? 'PATCH' : 'POST', body: draft }),
        () => (id ? 'Rezept gespeichert' : `„${draft.name}“ angelegt`),
        'Rezept konnte nicht gespeichert werden'
      );
    },
    [run]
  );

  const deleteRecipe = useCallback(
    async (recipe: RecipeView) => {
      if (!window.confirm(`„${recipe.name}“ löschen? Wo es im Plan steht, kommt wieder das geplante Gericht.`)) return;
      await run(() => api(`/api/v1/nutrition/recipes/${recipe.id}`, { method: 'DELETE' }), () => 'Rezept gelöscht', 'Rezept konnte nicht gelöscht werden').catch(() => {});
      setDetail(null);
    },
    [run]
  );

  const openRecipe = useCallback((recipeId: string, portions?: number, context?: string) => setDetail({ id: recipeId, portions, context }), []);

  const ingredientMap = useMemo(() => new Map((data?.ingredients ?? []).map((i) => [i.slug, i])), [data?.ingredients]);
  const statsKey = useMemo(() => `${version}`, [version]);

  if (!data) {
    return (
      <section className="card card-pad" aria-busy={loading}>
        <p className="eyebrow">Ernährung</p>
        <p className="mt-3 text-[14px] text-ink-3">{loading ? 'Plan wird geladen…' : 'Plan konnte nicht geladen werden.'}</p>
      </section>
    );
  }

  const week = data.week;
  const focused = phase === 'focused';
  const weekBar = !focused || (focusId !== 'today' && focusId !== 'recipes' && focusId !== 'stats');
  const detailRecipe = detail ? data.recipes.find((r) => r.id === detail.id) ?? null : null;

  return (
    <>
      {showIntro && !focused && <IntroCard onOpenSettings={onOpenSettings} onDismiss={dismissIntro} />}

      {weekBar && (
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
          <div className="flex items-center rounded-[12px] border border-line/10 bg-sheet shadow-sheet">
            <button type="button" onClick={() => setWeekStart((w) => shiftWeek(w, -1))} className="icon-btn" aria-label="Vorige Woche">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[150px] px-1 text-center">
              <span className="block font-display text-[16px] font-semibold leading-tight text-ink">{week.label}</span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
                {week.isCurrent ? 'Diese Woche' : weekStart > thisWeek ? 'Kommende Woche' : 'Vergangene Woche'}
                {week.template && ` · ${week.template.name}`}
              </span>
            </span>
            <button type="button" onClick={() => setWeekStart((w) => shiftWeek(w, 1))} className="icon-btn" aria-label="Nächste Woche">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {!week.isCurrent && (
            <button type="button" onClick={() => setWeekStart(thisWeek)} className="btn-ghost h-9 px-3 text-[13px]">
              Heute
            </button>
          )}
          <a href={`/nutrition/print?week=${week.weekStart}&autoprint=1`} target="_blank" rel="noreferrer" className="btn-secondary ml-auto">
            <Printer className="h-4 w-4" /> PDF
          </a>
        </div>
      )}

      <div className={focused ? 'block' : 'flex flex-col gap-4 sm:gap-6 xl:grid xl:grid-cols-12 xl:items-start'}>
        <div className="contents xl:col-span-5 xl:flex xl:flex-col xl:gap-6">
          <Section id="today" className="order-1">
            {today && current ? (
              <MealsToday day={today} settings={data.settings} recipes={data.recipes} onLog={logMeal} onUndo={undo} onOpenRecipe={(id, portions) => openRecipe(id, portions)} />
            ) : (
              <section className="card card-pad">
                <p className="text-[14px] text-ink-3">Lädt…</p>
              </section>
            )}
          </Section>
          <Section id="prep" className="order-3">
            <PrepPlan week={week} onToggleStep={toggleStep} onOpenRecipe={openRecipe} />
          </Section>
          <Section id="shopping" className="order-4">
            <ShoppingPlan week={week} exporting={exporting} onExport={exportShopping} onOpenShoppingList={onOpenShoppingList} onApplySuggestion={applySuggestion} />
          </Section>
        </div>
        <div className="contents xl:col-span-7 xl:flex xl:flex-col xl:gap-6">
          <Section id="week" className="order-2">
            <WeekPlan
              week={week}
              templates={data.templates}
              settings={data.settings}
              onPickMeal={(meal, day) => setSwap({ meal, day })}
              onChooseTemplate={chooseTemplate}
              onSetSimple={setWeekMode}
            />
          </Section>
          <Section id="recipes" className="order-5">
            <RecipeBrowser recipes={data.recipes} ingredients={data.ingredients} onOpen={(r) => openRecipe(r.id)} onCreate={() => setEditor({ base: null, asCopy: false })} />
          </Section>
          <Section id="stats" className="order-6">
            <NutritionStats refreshKey={statsKey} />
          </Section>
        </div>
      </div>

      <SwapMealModal
        meal={swap?.meal ?? null}
        day={swap?.day ?? null}
        week={week}
        recipes={data.recipes}
        settings={data.settings}
        onClose={() => setSwap(null)}
        onSwap={(payload) => swapMeal(swap!.meal.entryId, payload)}
        onReset={(batch) => swapMeal(swap!.meal.entryId, { reset: true, batch })}
        onOpenRecipe={(id) => openRecipe(id, 1)}
      />

      {/* Rendered last so it stacks above the swap dialog when opened from there. */}
      <RecipeDetailModal
        recipe={detailRecipe}
        initialPortions={detail?.portions}
        context={detail?.context ?? null}
        ingredients={ingredientMap}
        onClose={() => setDetail(null)}
        onToggleFavorite={toggleFavorite}
        onEdit={(recipe, asCopy) => {
          setDetail(null);
          setEditor({ base: recipe, asCopy });
        }}
        onDelete={deleteRecipe}
      />
      <RecipeEditorModal
        isOpen={!!editor}
        base={editor?.base ?? null}
        asCopy={editor?.asCopy ?? false}
        ingredients={data.ingredients}
        store={data.settings.store}
        onClose={() => setEditor(null)}
        onSave={saveRecipe}
      />
    </>
  );
}
