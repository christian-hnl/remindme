'use client';

import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import type { SavingsPot } from '@/types';
import { formatEuro } from '@/lib/format';

interface WalletCardProps {
  safeToSpendDaily: number;
  dailyBudgetBaseline: number;
  totalBalance: number;
  freeThisMonth: number;
  pots: SavingsPot[];
  onOpenWealth: () => void;
  onAddTransaction: () => void;
  onOpenPot: (pot: SavingsPot) => void;
}

/** Compact money summary for the "Heute" view; full management lives in "Geld". */
export const WalletCard: React.FC<WalletCardProps> = ({
  safeToSpendDaily,
  dailyBudgetBaseline,
  totalBalance,
  freeThisMonth,
  pots,
  onOpenWealth,
  onAddTransaction,
  onOpenPot,
}) => {
  const ratio = dailyBudgetBaseline > 0 ? Math.min(1, safeToSpendDaily / dailyBudgetBaseline) : 0;
  const exhausted = safeToSpendDaily <= 0;
  const topPots = [...pots].sort((a, b) => b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount).slice(0, 3);
  const [euros, cents] = safeToSpendDaily.toFixed(2).split('.');

  return (
    <section className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Geld</p>
          <h2 className="card-title mt-1">Heute frei</h2>
        </div>
        <button type="button" onClick={onOpenWealth} className="btn-ghost -mr-2 h-9 px-3">
          Alles <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className={`font-display font-bold leading-none tabular ${exhausted ? 'text-pen' : 'text-ink'}`}>
          <span className="text-[52px]">{Number(euros).toLocaleString('de-DE')}</span>
          <span className="text-[30px]">,{cents}</span>
          <span className="ml-1 text-[28px] text-ink-3">€</span>
        </p>
        <button type="button" onClick={onAddTransaction} className="btn-secondary mb-1">
          <Plus className="h-4 w-4" /> Buchung
        </button>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-inset"
        role="meter"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tagesbudget"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${exhausted ? 'bg-pen' : ratio < 0.5 ? 'bg-warn' : 'bg-leaf'}`}
          style={{ width: `${Math.max(exhausted ? 100 : 2, ratio * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[13px] text-ink-3">
        {exhausted ? 'Tagesbudget aufgebraucht.' : `${Math.round(ratio * 100)} % vom Ø-Tagesbudget (${formatEuro(dailyBudgetBaseline)})`}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line/10 bg-line/10">
        <div className="bg-sheet px-3 py-2.5">
          <dt className="eyebrow text-[11px]">Kontostand</dt>
          <dd className={`mt-0.5 font-mono text-[15px] font-medium tabular ${totalBalance < 0 ? 'text-pen' : 'text-ink'}`}>
            {formatEuro(totalBalance)}
          </dd>
        </div>
        <div className="bg-sheet px-3 py-2.5">
          <dt className="eyebrow text-[11px]">Monat frei</dt>
          <dd className="mt-0.5 font-mono text-[15px] font-medium text-ink tabular">{formatEuro(freeThisMonth)}</dd>
        </div>
      </dl>

      {topPots.length > 0 && (
        <ul className="mt-4 space-y-3">
          {topPots.map((pot) => {
            const percent = pot.targetAmount > 0 ? Math.min(100, Math.round((pot.currentAmount / pot.targetAmount) * 100)) : 0;
            return (
              <li key={pot.id}>
                <button type="button" onClick={() => onOpenPot(pot)} className="block w-full rounded-md text-left">
                  <span className="flex items-baseline justify-between gap-2 text-[14px]">
                    <span className="truncate font-bold text-ink">{pot.name}</span>
                    <span className="flex-shrink-0 font-mono text-[12px] text-ink-3 tabular">
                      {formatEuro(pot.currentAmount, 0)} / {formatEuro(pot.targetAmount, 0)}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-inset">
                    <span className="block h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: pot.colorHex }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
