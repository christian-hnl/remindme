'use client';

import React from 'react';
import { Transaction } from '@/types';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  TrendingUp, 
  CheckCircle2, 
  CreditCard, 
  Plus, 
  Repeat 
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface CashflowRadarProps {
  transactions: Transaction[];
  monthlySavingsRate: number;
  fixedCostsCovered: boolean;
  onAddTransactionClick: () => void;
}

export const CashflowRadar: React.FC<CashflowRadarProps> = ({
  transactions,
  monthlySavingsRate,
  fixedCostsCovered,
  onAddTransactionClick,
}) => {
  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 sm:p-6 shadow-bento glow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Cashflow & Radar</h3>
            <p className="text-[11px] text-muted">Transaktionen & Fixkosten</p>
          </div>
        </div>

        <button
          onClick={onAddTransactionClick}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs border border-white/5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Buchung</span>
        </button>
      </div>

      {/* KPI Badges */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="rounded-2xl bg-[#161B26] p-3 border border-white/5">
          <div className="flex items-center justify-between text-[11px] text-muted mb-1">
            <span>Fixkosten Status</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-xs font-semibold text-emerald-400">
            {fixedCostsCovered ? '✅ Vollständig gedeckt' : '⚠️ Puffer prüfen'}
          </div>
        </div>

        <div className="rounded-2xl bg-[#161B26] p-3 border border-white/5">
          <div className="flex items-center justify-between text-[11px] text-muted mb-1">
            <span>Monats-Sparrate</span>
            <span className="text-[10px] font-mono text-emerald-400 font-medium">+Sparziel</span>
          </div>
          <div className="font-mono text-xs font-semibold text-white">
            +{monthlySavingsRate.toFixed(2)} € / Mo
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1">
          Letzte Bewegungen
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {transactions.slice(0, 6).map((tx) => {
            const isIncome = tx.type === 'income';
            const isPotTransfer = tx.type === 'transfer_to_pot';
            const amountFormatted = Math.abs(tx.amount).toFixed(2);

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#161B26] border border-white/5 hover:border-white/10 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg flex items-center justify-center ${
                      isIncome
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : isPotTransfer
                        ? 'bg-indigo-500/10 text-indigo-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-white truncate">{tx.title}</div>
                    <div className="text-[10px] text-muted flex items-center gap-1">
                      <span>{tx.category}</span>
                      {tx.isRecurring && (
                        <span className="flex items-center gap-0.5 text-indigo-400">
                          <Repeat className="h-2.5 w-2.5" /> Abo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`font-mono font-semibold text-right flex-shrink-0 ${
                    isIncome
                      ? 'text-emerald-400'
                      : isPotTransfer
                      ? 'text-indigo-300'
                      : 'text-white/90'
                  }`}
                >
                  {isIncome ? '+' : '-'}{amountFormatted} €
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
