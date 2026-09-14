'use client';

import React from 'react';
import { Sparkles, TrendingUp, ShieldCheck, Wallet, ArrowUpRight } from 'lucide-react';

interface SafeToSpendDialProps {
  safeToSpendDaily: number;
  totalBalance: number;
  freeAvailable: number;
}

export const SafeToSpendDial: React.FC<SafeToSpendDialProps> = ({
  safeToSpendDaily,
  totalBalance,
  freeAvailable,
}) => {
  // Max safe daily reference for circular meter visual (e.g. 50€)
  const maxDial = 50;
  const dialPercentage = Math.min(100, Math.max(0, (safeToSpendDaily / maxDial) * 100));
  const strokeDashoffset = 251.2 - (251.2 * dialPercentage) / 100;

  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 sm:p-6 shadow-bento glow-card-mint relative overflow-hidden">
      {/* Background Ambient Radial Glow */}
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Safe-to-Spend Dial</h3>
            <p className="text-[11px] text-muted">Dynamisches Tages-Restbudget</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <ShieldCheck className="h-3 w-3" />
          Aktiv
        </span>
      </div>

      {/* Hero Dial Container */}
      <div className="flex items-center justify-between py-2 px-1">
        <div>
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
            Heute noch frei verfügbar
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-baseline gap-1">
            <span>{safeToSpendDaily.toFixed(2)}</span>
            <span className="text-emerald-400 text-2xl font-normal">€</span>
          </div>
          <p className="text-xs text-muted mt-1.5 max-w-[210px] leading-relaxed">
            Bleibst du heute darunter, erhöht sich automatisch dein Budget fürs Wochenende!
          </p>
        </div>

        {/* Circular Progress Meter (Apple Watch & Copilot Style) */}
        <div className="relative flex items-center justify-center flex-shrink-0">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="#10B981"
              strokeWidth="7"
              strokeDasharray={251.2}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xs font-mono font-bold text-emerald-400">
              {Math.round(dialPercentage)}%
            </span>
            <span className="text-[9px] uppercase font-semibold text-muted">Puffer</span>
          </div>
        </div>
      </div>

      {/* Bottom Balance Strip */}
      <div className="mt-5 grid grid-cols-2 gap-2 pt-4 border-t border-white/[0.06]">
        <div className="rounded-2xl bg-[#161B26] p-2.5 border border-white/5">
          <div className="text-[11px] text-muted">Gesamter Kontostand</div>
          <div className="font-mono text-sm font-semibold text-white mt-0.5">
            {totalBalance.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
          </div>
        </div>
        <div className="rounded-2xl bg-[#161B26] p-2.5 border border-white/5">
          <div className="text-[11px] text-muted">Monatlich frei</div>
          <div className="font-mono text-sm font-semibold text-emerald-400 mt-0.5">
            {freeAvailable.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
          </div>
        </div>
      </div>
    </div>
  );
};
