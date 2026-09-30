'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronDown, PiggyBank, ShoppingCart } from 'lucide-react';
import { Progress } from '@/components/wealth/charts';
import { formatEuro } from '@/lib/format';
import { formatGrams } from '@/lib/nutrition/plan';
import type { BudgetSuggestion } from '@/lib/nutrition/plan';
import type { WeekView } from '@/lib/nutrition/views';

interface ShoppingPlanProps {
  week: WeekView;
  exporting: boolean;
  onExport: (includePantry: boolean) => void;
  onOpenShoppingList: () => void;
  onApplySuggestion: (s: BudgetSuggestion) => void;
}

const dayRange = (days: number[]) => (days.length === 7 ? 'Mo–So' : days.length === 5 ? 'Mo–Fr' : days.map((d) => ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][d]).join(', '));

export function ShoppingPlan({ week, exporting, onExport, onOpenShoppingList, onApplySuggestion }: ShoppingPlanProps) {
  const [withPantry, setWithPantry] = useState(false);
  const [showPantry, setShowPantry] = useState(false);
  const { shopping, budget } = week;
  const pantry = shopping.lines.filter((l) => l.pantry);
  const share = budget.limit > 0 ? budget.used / budget.limit : 0;

  return (
    <section className="card" aria-label="Einkauf">
      <div className="p-4 pb-2 sm:p-5 sm:pb-2">
        <p className="eyebrow">
          Einkauf · {dayRange(shopping.days)} · {week.label}
        </p>
        <h2 className="card-title mt-1">Einkaufsliste</h2>
        <p className="mt-1 text-[13px] text-ink-3">Mengen aus dem Plan zusammengefasst, nach Abteilung sortiert (Hofer/Lidl-Preise, geschätzt).</p>
      </div>

      <div className="mx-4 mt-2 rounded-[12px] bg-inset p-3 sm:mx-5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-bold text-ink-2">Verbrauch dieser Woche</span>
          <span className="font-mono text-[20px] font-semibold text-ink tabular">
            {formatEuro(budget.used)} <span className="text-[13px] font-normal text-ink-3">/ {formatEuro(budget.limit, 0)}</span>
          </span>
        </div>
        <Progress value={share} tone={budget.over > 0 ? 'warn' : 'leaf'} className="mt-2" />
        <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
          An der Kassa ca. <span className="font-mono tabular">{formatEuro(shopping.packCost)}</span> für ganze Packungen – Reis, Haferflocken & Co. reichen für mehrere Wochen.
          {budget.over > 0 ? ` ${formatEuro(budget.over)} über Budget.` : ` ${formatEuro(-budget.over)} unter Budget.`}
        </p>
      </div>

      {budget.suggestions.length > 0 && (
        <div className="mx-4 mt-3 sm:mx-5">
          <p className="eyebrow mb-1.5 flex items-center gap-1.5">
            <PiggyBank className="h-3.5 w-3.5" /> Sparvorschläge (ähnliche Makros)
          </p>
          <ul className="space-y-1.5">
            {budget.suggestions.map((s) => (
              <li key={`${s.slot}-${s.fromRecipeId}`} className="flex items-center gap-2 rounded-[10px] border border-line/10 px-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="font-bold text-ink">{s.toName}</span>
                  <span className="text-ink-3"> statt {s.fromName}</span>
                </span>
                <span className="font-mono text-leaf tabular">−{formatEuro(s.saving)}</span>
                <button type="button" onClick={() => onApplySuggestion(s)} className="btn-secondary h-8 px-2.5 text-[12px]">
                  Tauschen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-4 pb-2 pt-3 sm:px-5">
        {shopping.departments
          .filter((d) => d.lines.some((l) => !l.pantry))
          .map((d) => (
            <div key={d.name} className="mb-3">
              <p className="eyebrow mb-1 flex justify-between text-[11px]">
                <span>{d.name}</span>
                <span className="font-mono normal-case tracking-normal tabular">{formatEuro(d.cost)}</span>
              </p>
              <ul className="divide-y divide-line/10">
                {d.lines
                  .filter((l) => !l.pantry)
                  .map((l) => (
                    <li key={l.slug} className="flex items-center gap-3 py-1.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-ink">{l.name}</span>
                        <span className="text-[12px] text-ink-3">braucht {formatGrams(l.grams)}</span>
                      </span>
                      <span className="flex-shrink-0 text-right">
                        <span className="block font-mono text-[13px] text-ink-2 tabular">{l.quantity}</span>
                        <span className="block font-mono text-[11px] text-ink-3 tabular">{formatEuro(l.packCost)}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}

        {pantry.length > 0 && (
          <div className="border-t border-line/10 pt-2">
            <button type="button" onClick={() => setShowPantry((v) => !v)} className="btn-ghost -ml-2 h-8 px-2 text-[13px]" aria-expanded={showPantry}>
              <ChevronDown className={`h-4 w-4 transition-transform ${showPantry ? '' : '-rotate-90'}`} />
              Vorrat prüfen ({pantry.length}) – Öl, Gewürze, Honig …
            </button>
            {showPantry && (
              <ul className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {pantry.map((l) => (
                  <li key={l.slug} className="flex items-center justify-between gap-2 py-1 text-[13px]">
                    <span className="truncate text-ink-2">{l.name}</span>
                    <span className="flex-shrink-0 font-mono text-[12px] text-ink-3 tabular">{formatGrams(l.grams)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line/10 p-4 sm:px-5">
        <button type="button" disabled={exporting} onClick={() => onExport(withPantry)} className="btn-primary">
          <ShoppingCart className="h-4 w-4" /> {exporting ? 'Übernimmt…' : 'In Einkaufsliste übernehmen'}
        </button>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={withPantry} onChange={(e) => setWithPantry(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
          Vorrat mitnehmen
        </label>
        {week.exportedAt && (
          <button type="button" onClick={onOpenShoppingList} className="btn-ghost ml-auto h-9 px-2 text-[13px]">
            Übernommen – zur Liste <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
