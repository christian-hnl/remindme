'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChefHat, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { lookupOf, recipeNutrition, storeFactor } from '@/lib/nutrition/macros';
import { DEPARTMENTS, EQUIPMENT, MEAL_TYPE_LABELS, type IngredientData, type MealType, type StoreId } from '@/lib/nutrition/types';
import type { RecipeView } from '@/lib/nutrition/views';
import { MacroTable } from './shared';

export interface RecipeDraft {
  name: string;
  mealType: MealType;
  description: string;
  flavorHack: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  fridgeDays: number;
  freezerDays: number;
  eatCold: boolean;
  tags: string[];
  equipment: string[];
  steps: string[];
  ingredients: { slug: string; grams: number }[];
}

interface RecipeEditorModalProps {
  isOpen: boolean;
  /** Existing recipe (own = edit, built-in = copy) or null for a blank one. */
  base: RecipeView | null;
  asCopy: boolean;
  ingredients: IngredientData[];
  store: StoreId;
  onClose: () => void;
  onSave: (draft: RecipeDraft, id?: string) => Promise<void>;
}

const blank: RecipeDraft = {
  name: '',
  mealType: 'main',
  description: '',
  flavorHack: '',
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 20,
  fridgeDays: 3,
  freezerDays: 0,
  eatCold: false,
  tags: [],
  equipment: ['Herd'],
  steps: [],
  ingredients: [{ slug: 'huehnerbrust', grams: 250 }],
};

const MEAL_TYPES = Object.keys(MEAL_TYPE_LABELS) as MealType[];

/** Own recipes: pick ingredients with grams, nutrition and cost follow live. */
export function RecipeEditorModal({ isOpen, base, asCopy, ingredients, store, onClose, onSave }: RecipeEditorModalProps) {
  const [draft, setDraft] = useState<RecipeDraft>(blank);
  const [stepsText, setStepsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const next: RecipeDraft = base
      ? {
          name: asCopy ? `${base.name} (meine Version)` : base.name,
          mealType: base.mealType,
          description: base.description,
          flavorHack: base.flavorHack,
          servings: base.servings,
          prepMinutes: base.prepMinutes,
          cookMinutes: base.cookMinutes,
          fridgeDays: base.fridgeDays,
          freezerDays: base.freezerDays,
          eatCold: base.eatCold,
          tags: base.tags,
          equipment: base.equipment,
          steps: base.steps,
          ingredients: base.ingredients.map((i) => ({ slug: i.slug, grams: i.grams })),
        }
      : blank;
    setDraft(next);
    setStepsText(next.steps.join('\n'));
    setTagsText(next.tags.join(', '));
  }, [isOpen, base, asCopy]);

  const lookup = useMemo(() => lookupOf(ingredients), [ingredients]);
  const grouped = useMemo(
    () => DEPARTMENTS.map((d) => ({ d, list: ingredients.filter((i) => i.department === d).sort((a, b) => a.name.localeCompare(b.name, 'de')) })).filter((g) => g.list.length),
    [ingredients]
  );
  const nutrition = useMemo(() => {
    const n = recipeNutrition({ servings: draft.servings, ingredients: draft.ingredients.filter((i) => i.grams > 0) }, lookup, storeFactor(store));
    return { kcal: Math.round(n.kcal), protein: Math.round(n.protein * 10) / 10, carbs: Math.round(n.carbs * 10) / 10, fat: Math.round(n.fat * 10) / 10, cost: Math.round(n.cost * 100) / 100 };
  }, [draft.ingredients, draft.servings, lookup, store]);

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setIngredient = (index: number, patch: Partial<RecipeDraft['ingredients'][number]>) =>
    setDraft((d) => ({ ...d, ingredients: d.ingredients.map((i, n) => (n === index ? { ...i, ...patch } : i)) }));

  const valid = draft.name.trim() && draft.ingredients.some((i) => i.grams > 0);
  const editingOwn = !!base && base.isCustom && !asCopy;

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(
        {
          ...draft,
          name: draft.name.trim(),
          steps: stepsText.split('\n').map((s) => s.trim()).filter(Boolean),
          tags: tagsText.split(',').map((s) => s.trim()).filter(Boolean),
          ingredients: draft.ingredients.filter((i) => i.grams > 0),
        },
        editingOwn ? base!.id : undefined
      );
      onClose();
    } catch {
      // toast from the hub
    } finally {
      setSaving(false);
    }
  };

  const numberField = (key: 'servings' | 'prepMinutes' | 'cookMinutes' | 'fridgeDays' | 'freezerDays', label: string) => (
    <div>
      <label htmlFor={`recipe-${key}`} className="field-label">
        {label}
      </label>
      <input
        id={`recipe-${key}`}
        inputMode="numeric"
        value={String(draft[key])}
        onChange={(e) => set(key, Math.max(0, parseInt(e.target.value || '0', 10) || 0))}
        className="field-input font-mono"
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={editingOwn ? 'Rezept bearbeiten' : 'Eigenes Rezept'}
      subtitle="Nährwerte und Kosten rechnen sich aus den Zutaten"
      icon={<ChefHat className="h-[18px] w-[18px]" />}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Abbrechen
          </button>
          <button type="button" disabled={!valid || saving} onClick={submit} className="btn-primary">
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="recipe-name" className="field-label">
              Name
            </label>
            <input id="recipe-name" value={draft.name} onChange={(e) => set('name', e.target.value)} maxLength={80} className="field-input" autoFocus />
          </div>
          <div>
            <label htmlFor="recipe-type" className="field-label">
              Mahlzeit
            </label>
            <select id="recipe-type" value={draft.mealType} onChange={(e) => set('mealType', e.target.value as MealType)} className="field-input">
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MEAL_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="field-label">Zutaten (für alle Portionen, in Gramm)</p>
          <ul className="space-y-2">
            {draft.ingredients.map((row, index) => (
              <li key={index} className="flex items-center gap-2">
                <select value={row.slug} onChange={(e) => setIngredient(index, { slug: e.target.value })} className="field-input h-10 min-w-0 flex-1 py-0" aria-label="Zutat">
                  {grouped.map((g) => (
                    <optgroup key={g.d} label={g.d}>
                      {g.list.map((i) => (
                        <option key={i.slug} value={i.slug}>
                          {i.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  inputMode="decimal"
                  value={row.grams ? String(row.grams) : ''}
                  onChange={(e) => setIngredient(index, { grams: parseFloat(e.target.value.replace(',', '.')) || 0 })}
                  className="field-input h-10 w-24 py-0 text-right font-mono"
                  aria-label="Gramm"
                  placeholder="g"
                />
                <button
                  type="button"
                  onClick={() => set('ingredients', draft.ingredients.filter((_, n) => n !== index))}
                  className="icon-btn hover:text-pen"
                  aria-label="Zutat entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => set('ingredients', [...draft.ingredients, { slug: ingredients[0]?.slug ?? '', grams: 100 }])} className="btn-secondary mt-2">
            <Plus className="h-4 w-4" /> Zutat
          </button>
          <div className="mt-3">
            <p className="eyebrow mb-1.5">Pro Portion</p>
            <MacroTable n={nutrition} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {numberField('servings', 'Portionen')}
          {numberField('prepMinutes', 'Vorbereiten')}
          {numberField('cookMinutes', 'Kochen')}
          {numberField('fridgeDays', 'Kühlschrank (Tage)')}
          {numberField('freezerDays', 'TK (Tage, 0 = nein)')}
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-[10px] bg-inset px-3 py-2 text-[14px] font-bold text-ink">
            <input type="checkbox" checked={draft.eatCold} onChange={(e) => set('eatCold', e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
            kalt essbar
          </label>
          {EQUIPMENT.filter((e) => e !== 'Mikrowelle').map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={draft.equipment.includes(e)}
              onClick={() => set('equipment', draft.equipment.includes(e) ? draft.equipment.filter((x) => x !== e) : [...draft.equipment, e])}
              className="tab"
            >
              {e}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="recipe-steps" className="field-label">
            Schritte (eine Zeile pro Schritt)
          </label>
          <textarea id="recipe-steps" value={stepsText} onChange={(e) => setStepsText(e.target.value)} rows={5} className="field-input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="recipe-hack" className="field-label">
              Flavor-Hack
            </label>
            <textarea id="recipe-hack" value={draft.flavorHack} onChange={(e) => set('flavorHack', e.target.value)} rows={2} className="field-input" />
          </div>
          <div>
            <label htmlFor="recipe-tags" className="field-label">
              Tags (mit Komma)
            </label>
            <input id="recipe-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="kalt, asia, budget" className="field-input" />
            <label htmlFor="recipe-desc" className="field-label mt-3">
              Kurzbeschreibung
            </label>
            <input id="recipe-desc" value={draft.description} onChange={(e) => set('description', e.target.value)} maxLength={400} className="field-input" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
