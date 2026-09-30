'use client';

import React, { useEffect, useState } from 'react';
import { BookOpenText, Carrot, Clock, Copy, Minus, Pencil, Plus, Refrigerator, Snowflake, Sparkles, Star, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { IngredientData } from '@/lib/nutrition/types';
import { MEAL_TYPE_LABELS } from '@/lib/nutrition/types';
import type { RecipeView } from '@/lib/nutrition/views';
import { MacroTable, fmtNum } from './shared';

interface RecipeDetailModalProps {
  recipe: RecipeView | null;
  /** Portions to show the amounts for, e.g. the boxes of a prep session. Defaults to the recipe's yield. */
  initialPortions?: number;
  /** Why it's open, e.g. "Sonntags-Prep · 3 Boxen". */
  context?: string | null;
  ingredients: Map<string, IngredientData>;
  onClose: () => void;
  onToggleFavorite: (recipe: RecipeView) => void;
  onEdit: (recipe: RecipeView, asCopy: boolean) => void;
  onDelete: (recipe: RecipeView) => void;
}

/** Amount for people: "2 Stk (120 g)" for eggs, "150 g" for the rest. */
function amount(ing: IngredientData | undefined, grams: number) {
  if (!ing) return `${fmtNum(grams)} g`;
  if (ing.pieceGrams && ['eier', 'banane', 'apfel', 'wraps', 'burgerbroetchen', 'vollkornbrot', 'reiswaffeln', 'knoblauch', 'zitrone'].includes(ing.slug)) {
    const pieces = grams / ing.pieceGrams;
    const rounded = Math.round(pieces * 2) / 2;
    if (rounded >= 0.5) return `${rounded.toLocaleString('de-DE')} ${ing.pieceLabel} (${fmtNum(grams)} g)`;
  }
  return grams >= 1000 ? `${(grams / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} kg` : `${fmtNum(grams, grams < 10 ? 1 : 0)} g`;
}

export function RecipeDetailModal({ recipe, initialPortions, context, ingredients, onClose, onToggleFavorite, onEdit, onDelete }: RecipeDetailModalProps) {
  const [portions, setPortions] = useState(1);
  useEffect(() => setPortions(initialPortions ?? recipe?.servings ?? 1), [recipe?.id, recipe?.servings, initialPortions]);
  if (!recipe) return null;
  const factor = portions / recipe.servings;

  return (
    <Modal
      isOpen={!!recipe}
      onClose={onClose}
      size="lg"
      title={recipe.name}
      subtitle={context ?? `${MEAL_TYPE_LABELS[recipe.mealType]} · Nährwerte pro Portion`}
      icon={<BookOpenText className="h-[18px] w-[18px]" />}
      footer={
        <>
          {recipe.isCustom ? (
            <>
              <button type="button" onClick={() => onDelete(recipe)} className="btn-danger mr-auto">
                <Trash2 className="h-4 w-4" /> Löschen
              </button>
              <button type="button" onClick={() => onEdit(recipe, false)} className="btn-secondary">
                <Pencil className="h-4 w-4" /> Bearbeiten
              </button>
            </>
          ) : (
            <button type="button" onClick={() => onEdit(recipe, true)} className="btn-secondary mr-auto">
              <Copy className="h-4 w-4" /> Als eigenes Rezept kopieren
            </button>
          )}
          <button type="button" onClick={() => onToggleFavorite(recipe)} className="btn-primary" aria-pressed={recipe.isFavorite}>
            <Star className={`h-4 w-4 ${recipe.isFavorite ? 'fill-current' : ''}`} /> {recipe.isFavorite ? 'Favorit' : 'Merken'}
          </button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-ink-2">{recipe.description}</p>

      <div className="mt-4">
        <MacroTable n={recipe.nutrition} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="chip">
          <Clock className="h-3 w-3" /> {recipe.prepMinutes + recipe.cookMinutes} min
          {recipe.cookMinutes > 0 && ` (${recipe.cookMinutes} Kochen)`}
        </span>
        {recipe.fridgeDays > 0 && (
          <span className="chip">
            <Refrigerator className="h-3 w-3" /> {recipe.fridgeDays} {recipe.fridgeDays === 1 ? 'Tag' : 'Tage'}
          </span>
        )}
        <span className="chip">
          <Snowflake className="h-3 w-3" /> {recipe.freezerDays > 0 ? `${Math.round(recipe.freezerDays / 30) || 1} Mon.` : 'nicht einfrieren'}
        </span>
        <span className="chip">{recipe.eatCold ? 'kalt essbar' : 'warm essen'}</span>
        {recipe.produce > 0 && (
          <span className="chip text-leaf" title="Obst & Gemüse pro Portion (Ziel: 400 g am Tag)">
            <Carrot className="h-3 w-3" /> {fmtNum(recipe.produce)} g Obst & Gemüse
          </span>
        )}
        {recipe.equipment.map((e) => (
          <span key={e} className="chip">
            {e}
          </span>
        ))}
        {recipe.tags.map((t) => (
          <span key={t} className="chip font-normal text-ink-3">
            #{t}
          </span>
        ))}
        {recipe.issues.map((i) => (
          <span key={i} className="chip text-pen">
            {i}
          </span>
        ))}
      </div>

      {recipe.flavorHack && (
        <div className="mt-4 rounded-[12px] border border-marker/60 bg-marker/15 p-3">
          <p className="eyebrow flex items-center gap-1.5 text-ink-2">
            <Sparkles className="h-3.5 w-3.5" /> Flavor-Hack
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink">{recipe.flavorHack}</p>
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">Zutaten</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPortions((p) => Math.max(1, Math.ceil(p) - 1))} className="icon-btn h-7 w-7" aria-label="Weniger Portionen">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-20 text-center font-mono text-[12px] text-ink-2 tabular">
                {portions.toLocaleString('de-DE')} {portions === 1 ? 'Portion' : 'Portionen'}
              </span>
              <button type="button" onClick={() => setPortions((p) => Math.min(12, Math.floor(p) + 1))} className="icon-btn h-7 w-7" aria-label="Mehr Portionen">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <ul className="divide-y divide-line/10">
            {recipe.ingredients.map((i) => {
              const ing = ingredients.get(i.slug);
              return (
                <li key={i.slug} className="flex items-baseline justify-between gap-3 py-1.5 text-[14px]">
                  <span className="min-w-0 text-ink">
                    {ing?.name ?? i.slug}
                    {i.note && <span className="text-ink-3"> ({i.note})</span>}
                  </span>
                  <span className="flex-shrink-0 font-mono text-[13px] text-ink-2 tabular">{amount(ing, i.grams * factor)}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="eyebrow mb-2">Schritte</p>
          <ol className="space-y-2.5">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-inset font-mono text-[12px] font-medium text-ink-2">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Modal>
  );
}
