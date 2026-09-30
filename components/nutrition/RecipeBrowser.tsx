'use client';

import React, { useMemo, useState } from 'react';
import { Carrot, Plus, Search, Snowflake, Star } from 'lucide-react';
import { costPer10gProtein } from '@/lib/nutrition/macros';
import { MEAL_TYPE_LABELS, type IngredientData, type MealType } from '@/lib/nutrition/types';
import type { RecipeView } from '@/lib/nutrition/views';
import { MacroLine } from './shared';

interface RecipeBrowserProps {
  recipes: RecipeView[];
  ingredients: IngredientData[];
  onOpen: (recipe: RecipeView) => void;
  onCreate: () => void;
}

type SortKey = 'name' | 'protein' | 'cost' | 'kcal' | 'value' | 'produce';

const TYPES: (MealType | 'all')[] = ['all', 'breakfast', 'snack', 'main', 'preworkout', 'sauce'];
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'protein', label: 'Meistes Protein' },
  { id: 'value', label: '€ pro 10 g Protein' },
  { id: 'cost', label: 'Günstigste' },
  { id: 'kcal', label: 'Wenigste kcal' },
  { id: 'produce', label: 'Meistes Gemüse' },
];
const COST_LIMITS = [0, 1, 1.5, 2, 2.5];
const PROTEIN_MIN = [0, 20, 30, 40];

export function RecipeBrowser({ recipes, ingredients, onOpen, onCreate }: RecipeBrowserProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<MealType | 'all'>('all');
  const [tag, setTag] = useState('');
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyCold, setOnlyCold] = useState(false);
  const [onlyOwn, setOnlyOwn] = useState(false);
  const [maxCost, setMaxCost] = useState(0);
  const [minProtein, setMinProtein] = useState(0);
  const [sort, setSort] = useState<SortKey>('name');

  const ingredientMap = useMemo(() => new Map(ingredients.map((i) => [i.slug, i])), [ingredients]);
  const tags = useMemo(() => [...new Set(recipes.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, 'de')), [recipes]);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const value = (r: RecipeView) => costPer10gProtein(r.nutrition.cost, r.nutrition.protein) ?? Infinity;
    return recipes
      .filter(
        (r) =>
          (type === 'all' || r.mealType === type) &&
          (!tag || r.tags.includes(tag)) &&
          (!onlyFav || r.isFavorite) &&
          (!onlyCold || r.eatCold) &&
          (!onlyOwn || r.isCustom) &&
          (!maxCost || r.nutrition.cost <= maxCost) &&
          (!minProtein || r.nutrition.protein >= minProtein) &&
          (!needle ||
            r.name.toLowerCase().includes(needle) ||
            r.tags.some((t) => t.includes(needle)) ||
            r.ingredients.some((i) => ingredientMap.get(i.slug)?.name.toLowerCase().includes(needle)))
      )
      .sort((a, b) => {
        switch (sort) {
          case 'protein':
            return b.nutrition.protein - a.nutrition.protein;
          case 'cost':
            return a.nutrition.cost - b.nutrition.cost;
          case 'kcal':
            return a.nutrition.kcal - b.nutrition.kcal;
          case 'value':
            return value(a) - value(b);
          case 'produce':
            return b.produce - a.produce;
          default:
            return Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name, 'de');
        }
      });
  }, [recipes, query, type, tag, onlyFav, onlyCold, onlyOwn, maxCost, minProtein, sort, ingredientMap]);

  return (
    <section className="card" aria-label="Rezepte">
      <div className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div>
          <p className="eyebrow">{recipes.length} Rezepte</p>
          <h2 className="card-title mt-1">Rezepte</h2>
        </div>
        <button type="button" onClick={onCreate} className="btn-secondary h-9 flex-shrink-0 px-3">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Eigenes
        </button>
      </div>

      <div className="space-y-2 px-4 pt-2 sm:px-5">
        <label className="relative block">
          <span className="sr-only">Rezepte durchsuchen</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen – Name, Zutat oder Tag" className="field-input h-10 py-0 pl-9" />
        </label>
        <div className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Mahlzeit">
          {TYPES.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => setType(t)} className="tab h-8 px-3 text-[13px]">
              {t === 'all' ? 'Alle' : MEAL_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" aria-pressed={onlyFav} onClick={() => setOnlyFav((v) => !v)} className="tab h-8 px-3 text-[13px]">
            <Star className="h-3.5 w-3.5" /> Favoriten
          </button>
          <button type="button" aria-pressed={onlyCold} onClick={() => setOnlyCold((v) => !v)} className="tab h-8 px-3 text-[13px]">
            Kalt essbar
          </button>
          <button type="button" aria-pressed={onlyOwn} onClick={() => setOnlyOwn((v) => !v)} className="tab h-8 px-3 text-[13px]">
            Eigene
          </button>
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="field-input h-8 w-auto py-0 text-[13px]" aria-label="Tag">
            <option value="">Alle Tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <select value={maxCost} onChange={(e) => setMaxCost(Number(e.target.value))} className="field-input h-8 w-auto py-0 text-[13px]" aria-label="Kosten">
            {COST_LIMITS.map((c) => (
              <option key={c} value={c}>
                {c ? `bis ${c.toLocaleString('de-DE')} €` : 'Alle Preise'}
              </option>
            ))}
          </select>
          <select value={minProtein} onChange={(e) => setMinProtein(Number(e.target.value))} className="field-input h-8 w-auto py-0 text-[13px]" aria-label="Protein">
            {PROTEIN_MIN.map((p) => (
              <option key={p} value={p}>
                {p ? `ab ${p} g Protein` : 'Jedes Protein'}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="field-input h-8 w-auto py-0 text-[13px]" aria-label="Sortierung">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ul className="grid gap-2 p-4 sm:grid-cols-2 sm:px-5">
        {list.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => onOpen(r)} className="flex h-full w-full flex-col rounded-[12px] border border-line/10 p-3 text-left transition-colors hover:border-accent/40 hover:bg-inset/60">
              <span className="flex items-start gap-2">
                <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-ink">{r.name}</span>
                {r.isFavorite && <Star className="mt-0.5 h-4 w-4 flex-shrink-0 fill-marker text-marker" />}
              </span>
              <span className="mt-1 line-clamp-2 text-[12px] text-ink-3">{r.description}</span>
              <span className="mt-auto flex flex-wrap items-center gap-1 pt-2">
                <MacroLine n={r.nutrition} />
                <span className="chip">{MEAL_TYPE_LABELS[r.mealType]}</span>
                {r.eatCold && r.mealType === 'main' && <span className="chip">kalt</span>}
                {r.produce >= 150 && (
                  <span className="chip text-leaf" title="Obst & Gemüse pro Portion">
                    <Carrot className="h-3 w-3" /> {r.produce} g
                  </span>
                )}
                {r.freezerDays > 0 && r.mealType === 'main' && (
                  <span className="chip">
                    <Snowflake className="h-3 w-3" />
                  </span>
                )}
                {r.isCustom && <span className="chip">eigenes</span>}
                {r.eatenCount > 0 && <span className="chip font-normal">{r.eatenCount}× gegessen</span>}
                {r.issues.length > 0 && <span className="chip text-pen">{r.issues[0]}</span>}
              </span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-8 text-center text-[14px] text-ink-3 sm:col-span-2">Kein Rezept passt zu den Filtern.</li>}
      </ul>
    </section>
  );
}
