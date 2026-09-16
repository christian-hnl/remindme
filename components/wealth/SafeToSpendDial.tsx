'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { formatEuro } from '@/lib/format';

interface SafeToSpendDialProps {
  safeToSpendDaily: number;
  dailyBudgetBaseline: number;
  totalBalance: number;
  freeThisMonth: number;
  monthlyBudget: number;
  onOpenSettings: () => void;
}

/** Daily budget overview for the "Geld" view. */
export const SafeToSpendDial: React.FC<SafeToSpendDialProps> = ({
  safeToSpendDaily,
  dailyBudgetBaseline,
  totalBalance,
  freeThisMonth,
  monthlyBudget,
  onOpenSettings,
}) => {
  const ratio = dailyBudgetBaseline > 0 ? Math.min(1, safeToSpendDaily / dailyBudgetBaseline) : 0;
  const exhausted = safeToSpendDaily <= 0;
  const [euros, cents] = safeToSpendDaily.toFixed(2).split('.');

  return (
    <section className="card card-pad" aria-label="Tagesbudget">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Tagesbudget</p>
          <h2 className="card-title mt-1">Heute frei</h2>
        </div>
        <button type="button" onClick={onOpenSettings} className="icon-btn -mr-2" aria-label="Monatsbudget ändern" title="Monatsbudget ändern">
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
      </div>

      <p className={`mt-3 font-display font-bold leading-none tabular ${exhausted ? 'text-pen' : 'text-ink'}`}>
        <span className="text-[68px]">{Number(euros).toLocaleString('de-DE')}</span>
        <span className="text-[38px]">,{cents}</span>
        <span className="ml-1.5 text-[34px] text-ink-3">€</span>
      </p>

      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-inset"
        role="meter"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Anteil am durchschnittlichen Tagesbudget"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${exhausted ? 'bg-pen' : ratio < 0.5 ? 'bg-warn' : 'bg-leaf'}`}
          style={{ width: `${exhausted ? 100 : Math.max(2, ratio * 100)}%` }}
        />
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
        {exhausted
          ? 'Für heute ist das Budget aufgebraucht. Morgen wird der Rest des Monats neu verteilt.'
          : `Dein Monatsbudget von ${formatEuro(monthlyBudget, 0)} wird auf die restlichen Tage verteilt. Was du heute nicht ausgibst, bleibt für die nächsten Tage.`}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-line/10 bg-line/10">
        {[
          ['Kontostand', formatEuro(totalBalance), totalBalance < 0],
          ['Monat frei', formatEuro(freeThisMonth), false],
          ['Ø pro Tag', formatEuro(dailyBudgetBaseline), false],
        ].map(([label, value, negative]) => (
          <div key={label as string} className="min-w-0 bg-sheet px-2.5 py-2.5 sm:px-3">
            <dt className="eyebrow truncate text-[11px]">{label}</dt>
            <dd className={`mt-0.5 whitespace-nowrap font-mono text-[12.5px] font-medium tabular sm:text-[14px] ${negative ? 'text-pen' : 'text-ink'}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
