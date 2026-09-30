'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, UtensilsCrossed } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { MealType } from '@/lib/nutrition/types';
import { MEAL_TYPE_LABELS } from '@/lib/nutrition/types';
import type { RecipeView } from '@/lib/nutrition/views';
import { MacroLine } from './shared';

export type LogPayload = { recipeId: string } | { label: string; kcal?: number; protein?: number; carbs?: number; fat?: number };

interface LogMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  recipes: RecipeView[];
  /** Kinds shown first (the planned slot's), everything else follows. */
  preferred?: MealType[];
  onSubmit: (payload: LogPayload) => Promise<void>;
}

type Tab = 'recipe' | 'free';

const numberOrUndefined = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** "Something else instead" or an extra snack: pick a recipe, or type what it was. */
export function LogMealModal({ isOpen, onClose, title, subtitle, recipes, preferred = [], onSubmit }: LogMealModalProps) {
  const [tab, setTab] = useState<Tab>('recipe');
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTab('recipe');
    setQuery('');
    setLabel('');
    setKcal('');
    setProtein('');
  }, [isOpen]);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes
      .filter((r) => r.mealType !== 'sauce' && (!needle || r.name.toLowerCase().includes(needle)))
      .sort((a, b) => Number(preferred.includes(b.mealType)) - Number(preferred.includes(a.mealType)) || Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name, 'de'))
      .slice(0, 40);
  }, [recipes, query, preferred]);

  const submit = async (payload: LogPayload) => {
    setSaving(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch {
      // toast from the hub
    } finally {
      setSaving(false);
    }
  };

  const freeValid = label.trim() && (numberOrUndefined(kcal) !== undefined || numberOrUndefined(protein) !== undefined);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={title}
      subtitle={subtitle}
      icon={<UtensilsCrossed className="h-[18px] w-[18px]" />}
      footer={
        tab === 'free' ? (
          <>
            <button type="button" onClick={onClose} className="btn-ghost">
              Abbrechen
            </button>
            <button
              type="button"
              disabled={!freeValid || saving}
              onClick={() => submit({ label: label.trim(), kcal: numberOrUndefined(kcal), protein: numberOrUndefined(protein) })}
              className="btn-primary"
            >
              {saving ? 'Speichert…' : 'Eintragen'}
            </button>
          </>
        ) : undefined
      }
    >
      <div className="segmented mb-4 grid-cols-2" role="tablist">
        <button type="button" role="tab" aria-pressed={tab === 'recipe'} onClick={() => setTab('recipe')} className="segmented-item">
          Rezept
        </button>
        <button type="button" role="tab" aria-pressed={tab === 'free'} onClick={() => setTab('free')} className="segmented-item">
          Etwas anderes
        </button>
      </div>

      {tab === 'recipe' ? (
        <>
          <label className="relative block">
            <span className="sr-only">Rezept suchen</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rezept suchen" className="field-input pl-9" autoFocus />
          </label>
          <ul className="mt-2 divide-y divide-line/10">
            {list.map((r) => (
              <li key={r.id}>
                <button type="button" disabled={saving} onClick={() => submit({ recipeId: r.id })} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-inset/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-ink">{r.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[12px] text-ink-3">{MEAL_TYPE_LABELS[r.mealType]}</span>
                      <MacroLine n={r.nutrition} />
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="py-6 text-center text-[14px] text-ink-3">Kein Rezept gefunden.</li>}
          </ul>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="log-label" className="field-label">
              Was war es?
            </label>
            <input id="log-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Döner, Proteinriegel, Mensa" maxLength={80} className="field-input" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="log-kcal" className="field-label">
                kcal
              </label>
              <input id="log-kcal" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="z. B. 650" className="field-input font-mono" />
            </div>
            <div>
              <label htmlFor="log-protein" className="field-label">
                Protein (g)
              </label>
              <input id="log-protein" inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="z. B. 30" className="field-input font-mono" />
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-ink-3">Ohne kcal schätze ich einen Protein-Snack mit rund 7 kcal pro Gramm Eiweiß.</p>
        </div>
      )}
    </Modal>
  );
}
