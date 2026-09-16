'use client';

import React, { useState } from 'react';
import type { SavingsPot } from '@/types';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatEuro } from '@/lib/format';
import { PotIcon } from './potIcons';

interface SavingsPotCardProps {
  pot: SavingsPot;
  onQuickDeposit: (potId: string, amount: number) => Promise<void>;
  onOpenDetails: (pot: SavingsPot) => void;
}

const QUICK_DEPOSIT = 25;

export const SavingsPotCard: React.FC<SavingsPotCardProps> = ({ pot, onQuickDeposit, onOpenDetails }) => {
  const [depositing, setDepositing] = useState(false);

  const percentage = pot.targetAmount > 0 ? Math.min(100, Math.round((pot.currentAmount / pot.targetAmount) * 100)) : 0;
  const remaining = Math.max(0, pot.targetAmount - pot.currentAmount);
  const reached = remaining === 0;

  const handleQuickDeposit = async () => {
    setDepositing(true);
    try {
      await onQuickDeposit(pot.id, QUICK_DEPOSIT);
    } catch {
      // The container shows the error.
    } finally {
      setDepositing(false);
    }
  };

  return (
    <article className="card card-pad flex flex-col">
      <button type="button" onClick={() => onOpenDetails(pot)} className="block rounded-md text-left">
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: `${pot.colorHex}22`, color: pot.colorHex }}
            >
              <PotIcon icon={pot.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-[21px] font-semibold leading-tight text-ink">{pot.name}</span>
              <span className="block text-[13px] text-ink-3">
                {pot.targetDate ? `bis ${format(new Date(pot.targetDate), 'MMMM yyyy', { locale: de })}` : 'ohne Zieldatum'}
              </span>
            </span>
          </span>
          <span className="font-display text-[26px] font-bold leading-none text-ink tabular">{percentage}%</span>
        </span>

        <span className="mt-4 block h-2.5 overflow-hidden rounded-full bg-inset" aria-hidden>
          <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${percentage}%`, backgroundColor: pot.colorHex }} />
        </span>

        <span className="mt-2 flex items-baseline justify-between gap-2 text-[13px]">
          <span className="font-mono text-ink tabular">
            {formatEuro(pot.currentAmount, 0)} <span className="text-ink-3">von {formatEuro(pot.targetAmount, 0)}</span>
          </span>
          <span className={reached ? 'font-bold text-leaf' : 'text-ink-3'}>
            {reached ? 'Ziel erreicht' : `noch ${formatEuro(remaining, 0)}`}
          </span>
        </span>
      </button>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={handleQuickDeposit} disabled={depositing || reached} className="btn-secondary flex-1">
          <Plus className="h-4 w-4" />
          {depositing ? 'Bucht…' : `${QUICK_DEPOSIT} € einzahlen`}
        </button>
        <button type="button" onClick={() => onOpenDetails(pot)} className="btn-ghost">
          Details
        </button>
      </div>
    </article>
  );
};
