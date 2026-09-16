'use client';

import React, { useState } from 'react';
import type { Transaction } from '@/types';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, PiggyBank, Plus, Repeat, Trash2, TrendingUp } from 'lucide-react';
import { formatEuro, relativeDayLabel } from '@/lib/format';

interface CashflowRadarProps {
  transactions: Transaction[];
  monthlySavingsRate: number;
  fixedCostsMonthly: number;
  fixedCostsCovered: boolean;
  onAddTransaction: () => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onShowAll: () => void;
}

type Filter = 'all' | 'out' | 'in';

const COLLAPSED_COUNT = 8;

const iconFor = (tx: Transaction) => {
  if (tx.type === 'transfer_to_pot' || tx.type === 'transfer_from_pot') return PiggyBank;
  if (tx.type === 'transfer') return ArrowLeftRight;
  if (tx.type === 'investment') return TrendingUp;
  return tx.amount > 0 ? ArrowDownLeft : ArrowUpRight;
};

export const CashflowRadar: React.FC<CashflowRadarProps> = ({
  transactions,
  monthlySavingsRate,
  fixedCostsMonthly,
  fixedCostsCovered,
  onAddTransaction,
  onDeleteTransaction,
  onEditTransaction,
  onShowAll,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = transactions.filter((tx) => (filter === 'out' ? tx.type === 'expense' : filter === 'in' ? tx.type === 'income' : true));
  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED_COUNT);

  return (
    <section className="card" aria-label="Buchungen">
      <div className="flex items-start justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
        <div>
          <p className="eyebrow">Konto</p>
          <h2 className="card-title mt-1">Buchungen</h2>
        </div>
        <button type="button" onClick={onAddTransaction} className="btn-secondary h-9 px-3">
          <Plus className="h-4 w-4" /> Buchung
        </button>
      </div>

      <dl className="mx-4 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line/10 bg-line/10 sm:mx-5">
        <div className="bg-sheet px-3 py-2.5">
          <dt className="eyebrow text-[11px]">Abos & Fixkosten</dt>
          <dd className="mt-0.5 font-mono text-[14px] font-medium text-ink tabular">{formatEuro(fixedCostsMonthly)} / Monat</dd>
          <dd className={`text-[12px] font-bold ${fixedCostsCovered ? 'text-leaf' : 'text-pen'}`}>{fixedCostsCovered ? 'gedeckt' : 'Kontostand reicht nicht'}</dd>
        </div>
        <div className="bg-sheet px-3 py-2.5">
          <dt className="eyebrow text-[11px]">Sparrate</dt>
          <dd className="mt-0.5 font-mono text-[14px] font-medium text-ink tabular">{formatEuro(monthlySavingsRate)} / Monat</dd>
          <dd className="text-[12px] text-ink-3">alle Spartöpfe</dd>
        </div>
      </dl>

      <div className="scrollbar-none mt-3 flex gap-1 overflow-x-auto px-4 sm:px-5" role="tablist" aria-label="Filter">
        {(
          [
            ['all', 'Alle'],
            ['out', 'Ausgaben'],
            ['in', 'Einnahmen'],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className="tab h-8 px-3 text-[13px]">
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-2 pt-1 sm:px-5">
        {transactions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[14px] text-ink-3">Noch keine Buchungen.</p>
            <button type="button" onClick={onAddTransaction} className="btn-primary mt-3">
              Erste Buchung erfassen
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-line/10">
            {visible.map((tx) => {
              const Icon = iconFor(tx);
              const neutral = tx.type !== 'income' && tx.type !== 'expense';
              return (
                <li key={tx.id} className="group flex items-center gap-3 py-2.5">
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                      tx.type === 'income' ? 'bg-leaf/15 text-leaf' : 'bg-inset text-ink-2'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <button type="button" onClick={() => onEditTransaction(tx)} className="min-w-0 flex-1 rounded-md text-left">
                    <span className="block truncate text-[15px] font-bold text-ink">{tx.title}</span>
                    <span className="flex items-center gap-1 truncate text-[12px] text-ink-3">
                      {[relativeDayLabel(new Date(tx.transactionDate)), tx.category, tx.bankAccount?.name].filter(Boolean).join(' · ')}
                      {tx.isRecurring && (
                        <span className="inline-flex items-center gap-0.5">
                          · <Repeat className="h-3 w-3" /> Abo
                        </span>
                      )}
                    </span>
                  </button>
                  <span
                    className={`flex-shrink-0 font-mono text-[15px] font-medium tabular ${
                      tx.type === 'income' ? 'text-leaf' : neutral ? 'text-ink-2' : 'text-ink'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : '−'}
                    {formatEuro(Math.abs(tx.amount))}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Buchung „${tx.title}“ löschen?`)) onDeleteTransaction(tx.id);
                    }}
                    className="icon-btn -mr-1 h-9 w-9 hover:text-pen sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                    aria-label={`Buchung „${tx.title}“ löschen`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="py-6 text-center text-[14px] text-ink-3">Keine Buchungen in diesem Filter.</li>}
          </ul>
        )}
        <div className="mb-2 flex gap-2">
          {filtered.length > COLLAPSED_COUNT && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="btn-ghost flex-1">
              {expanded ? 'Weniger' : `${filtered.length - COLLAPSED_COUNT} weitere`}
            </button>
          )}
          <button type="button" onClick={onShowAll} className="btn-ghost flex-1 text-accent">
            Alle Buchungen & Suche
          </button>
        </div>
      </div>
    </section>
  );
};
