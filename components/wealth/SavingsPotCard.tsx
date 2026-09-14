'use client';

import React, { useState } from 'react';
import { SavingsPot } from '@/types';
import { Laptop, Palmtree, ShieldCheck, PiggyBank, Plus, Sparkles, MoreHorizontal } from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface SavingsPotCardProps {
  pot: SavingsPot;
  onDeposit: (potId: string, amount: number) => Promise<void>;
  onOpenDetails: (pot: SavingsPot) => void;
}

export const SavingsPotCard: React.FC<SavingsPotCardProps> = ({
  pot,
  onDeposit,
  onOpenDetails,
}) => {
  const [depositing, setDepositing] = useState(false);

  const percentage = Math.min(100, Math.round((pot.currentAmount / pot.targetAmount) * 100));
  const remaining = Math.max(0, pot.targetAmount - pot.currentAmount);

  // Icon mapping
  const renderIcon = () => {
    switch (pot.icon) {
      case 'laptop':
        return <Laptop className="h-4 w-4" />;
      case 'palmtree':
        return <Palmtree className="h-4 w-4" />;
      case 'shield-check':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <PiggyBank className="h-4 w-4" />;
    }
  };

  const handleQuickDeposit = async () => {
    setDepositing(true);
    try {
      await onDeposit(pot.id, 25);
      fireMilestoneGlow();
    } catch (err) {
      console.error(err);
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="group rounded-2xl bg-[#161B26] border border-white/[0.07] p-4 hover:border-emerald-500/30 transition-all duration-200">
      {/* Title & Amounts */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-xl border flex items-center justify-center text-white"
            style={{
              backgroundColor: `${pot.colorHex}20`,
              borderColor: `${pot.colorHex}40`,
              color: pot.colorHex,
            }}
          >
            {renderIcon()}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight leading-tight">
              {pot.name}
            </h4>
            <span className="text-[11px] text-muted">
              {pot.targetDate
                ? `Ziel: ${format(new Date(pot.targetDate), 'dd. MMM yyyy', { locale: de })}`
                : 'Dauerhaftes Sparziel'}
            </span>
          </div>
        </div>

        {/* Current vs Target */}
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-white tracking-tight">
            {pot.currentAmount.toLocaleString('de-DE', { minimumFractionDigits: 0 })} /{' '}
            <span className="text-muted text-xs">
              {pot.targetAmount.toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
            </span>
          </div>
          <span className="text-[11px] font-mono font-medium text-emerald-400">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress Bar with Liquid Glow (Copilot / Things style) */}
      <div className="relative h-2.5 w-full rounded-full bg-black/40 overflow-hidden my-3 border border-white/5">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative"
          style={{
            width: `${percentage}%`,
            backgroundColor: pot.colorHex,
            boxShadow: `0 0 12px ${pot.colorHex}80`,
          }}
        />
      </div>

      {/* Meta Footer */}
      <div className="flex items-center justify-between text-xs text-muted mb-3">
        <span className="text-[11px]">
          Noch <strong className="text-white font-mono">{remaining.toLocaleString('de-DE')} €</strong>
          {pot.monthlyContribution > 0 && ` • ca. ${pot.monthlyContribution} €/mtl.`}
        </span>
      </div>

      {/* Action Buttons: Instant +25€ & Details */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
        <button
          onClick={handleQuickDeposit}
          disabled={depositing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{depositing ? 'Buche...' : '+ 25 € Einzahlen'}</span>
        </button>

        <button
          onClick={() => onOpenDetails(pot)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-muted hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span>Details</span>
        </button>
      </div>
    </div>
  );
};
