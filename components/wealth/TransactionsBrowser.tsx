'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { Repeat, Search, X } from 'lucide-react';
import type { Transaction } from '@/types';
import { api, errorMessage } from '@/lib/client';
import { formatEuro, relativeDayLabel } from '@/lib/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryMeta } from '@/lib/finance/categories';
import { TransactionEditModal, type EditableTransaction } from './TransactionEditModal';
import { FOOD_FILTER, type TransactionFilter } from './FinanceAnalysis';

interface TransactionsBrowserProps {
  filter: TransactionFilter;
  refreshKey: string;
  onChanged: () => void;
  onDelete: (id: string) => void;
}

interface ListResponse {
  transactions: Transaction[];
  total: number;
  income: number;
  expenses: number;
}

type Kind = 'all' | 'out' | 'in';
const PAGE = 100;

const toEditable = (t: Transaction): EditableTransaction => ({
  id: t.id,
  title: t.title,
  amount: t.amount,
  category: t.category,
  type: t.type,
  isRecurring: t.isRecurring,
  date: t.transactionDate,
  counterparty: t.counterparty,
  description: t.description,
  account: t.bankAccount?.name,
});

/** Period options: all, custom range from the analysis, and the last 12 months. */
function periodOptions(filter: TransactionFilter) {
  const now = new Date();
  const options = [{ id: 'all', label: 'Gesamter Zeitraum', from: undefined as string | undefined, to: undefined as string | undefined }];
  if (filter.from || filter.to) {
    const from = filter.from ? new Date(filter.from) : null;
    const to = filter.to ? new Date(filter.to) : null;
    const label = from && to ? `${format(from, 'd. MMM', { locale: de })} – ${format(new Date(to.getTime() - 1), 'd. MMM yy', { locale: de })}` : 'Ausgewählter Zeitraum';
    options.push({ id: 'custom', label, from: filter.from, to: filter.to });
  }
  for (let i = 0; i < 12; i++) {
    const start = subMonths(startOfMonth(now), i);
    options.push({ id: format(start, 'yyyy-MM'), label: format(start, 'LLLL yyyy', { locale: de }), from: start.toISOString(), to: addMonths(start, 1).toISOString() });
  }
  return options;
}

export function TransactionsBrowser({ filter, refreshKey, onChanged, onDelete }: TransactionsBrowserProps) {
  const options = useMemo(() => periodOptions(filter), [filter]);
  const [period, setPeriod] = useState(filter.from || filter.to ? 'custom' : 'all');
  const [category, setCategory] = useState(filter.category ?? '');
  const [kind, setKind] = useState<Kind>('all');
  const [query, setQuery] = useState(filter.q ?? '');
  const [debounced, setDebounced] = useState(filter.q ?? '');
  const [limit, setLimit] = useState(PAGE);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableTransaction | null>(null);

  // A new filter from the analysis replaces the current one.
  useEffect(() => {
    setPeriod(filter.from || filter.to ? 'custom' : 'all');
    setCategory(filter.category ?? '');
    setQuery(filter.q ?? '');
    setDebounced(filter.q ?? '');
    setKind('all');
    setLimit(PAGE);
  }, [filter]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const selected = options.find((o) => o.id === period) ?? options[0];

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: String(limit) });
    if (selected.from) params.set('from', selected.from);
    if (selected.to) params.set('to', selected.to);
    if (category) params.set('category', category);
    if (kind !== 'all') params.set('type', kind);
    if (debounced) params.set('q', debounced);
    setLoading(true);
    api<ListResponse>(`/api/v1/transactions?${params}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selected.from, selected.to, category, kind, debounced, limit, refreshKey]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of data?.transactions ?? []) {
      const key = format(new Date(t.transactionDate), 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [data]);

  const categoryOptions = [...new Set<string>([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, 'Umbuchung', 'Sparen & Anlegen', 'Sparen', 'Essen'])];
  const filtersActive = period !== 'all' || category || kind !== 'all' || query;

  return (
    <section className="card" aria-label="Alle Buchungen">
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Konto</p>
            <h2 className="card-title mt-1">Alle Buchungen</h2>
          </div>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setPeriod('all');
                setCategory('');
                setKind('all');
                setQuery('');
              }}
              className="btn-ghost h-8 px-2 text-[13px]"
            >
              <X className="h-4 w-4" /> Filter zurücksetzen
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <label htmlFor="tx-search" className="sr-only">
            Buchungen durchsuchen
          </label>
          <input
            id="tx-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Suchen: Billa, Spotify, Kino…"
            className="field-input h-11 pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            aria-label="Zeitraum"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setLimit(PAGE);
            }}
            className="field-input h-10 py-0 text-[14px] capitalize"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Kategorie"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setLimit(PAGE);
            }}
            className="field-input h-10 py-0 text-[14px]"
          >
            <option value="">Alle Kategorien</option>
            <option value={FOOD_FILTER}>🍽️ Essen (alles)</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {categoryMeta(c).emoji} {c}
              </option>
            ))}
          </select>
          <div className="segmented grid-cols-3" role="group" aria-label="Art">
            {(
              [
                ['all', 'Alle'],
                ['out', 'Aus'],
                ['in', 'Ein'],
              ] as [Kind, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={kind === id}
                onClick={() => {
                  setKind(id);
                  setLimit(PAGE);
                }}
                className="segmented-item"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-line/10 bg-line/10 text-[13px]">
            <div className="bg-sheet px-3 py-2">
              <dt className="text-ink-3">Buchungen</dt>
              <dd className="font-mono font-medium text-ink tabular">{data.total}</dd>
            </div>
            <div className="bg-sheet px-3 py-2">
              <dt className="text-ink-3">Ausgaben</dt>
              <dd className="font-mono font-medium text-ink tabular">{formatEuro(data.expenses, 0)}</dd>
            </div>
            <div className="bg-sheet px-3 py-2">
              <dt className="text-ink-3">Einnahmen</dt>
              <dd className="font-mono font-medium text-leaf tabular">{formatEuro(data.income, 0)}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className={`px-2 pb-3 sm:px-3 ${loading ? 'opacity-60' : ''}`}>
        {error && <p className="px-3 py-4 text-[14px] text-pen">{error}</p>}
        {data && data.transactions.length === 0 && <p className="py-10 text-center text-[14px] text-ink-3">Keine Buchungen gefunden.</p>}
        {groups.map(([day, list]) => {
          const net = list.filter((t) => t.type === 'income' || t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
          return (
            <div key={day}>
              <div className="sticky top-14 z-[1] flex items-baseline justify-between bg-sheet/95 px-3 pb-1 pt-3 backdrop-blur lg:top-16">
                <span className="text-[12px] font-bold uppercase tracking-wide text-ink-3">{relativeDayLabel(new Date(`${day}T12:00:00`))}</span>
                {net !== 0 && (
                  <span className={`font-mono text-[12px] tabular ${net > 0 ? 'text-leaf' : 'text-ink-3'}`}>
                    {net > 0 ? '+' : '−'}
                    {formatEuro(Math.abs(net))}
                  </span>
                )}
              </div>
              <ul>
                {list.map((t) => {
                  const neutral = t.type !== 'income' && t.type !== 'expense';
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => setEditing(toEditable(t))} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left hover:bg-inset">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-inset text-[17px]" aria-hidden>
                          {categoryMeta(t.category).emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold text-ink">{t.title}</span>
                          <span className="flex items-center gap-1 truncate text-[12px] text-ink-3">
                            {[t.category, t.bankAccount?.name].filter(Boolean).join(' · ')}
                            {t.isRecurring && <Repeat className="h-3 w-3" aria-label="regelmäßig" />}
                          </span>
                        </span>
                        <span className={`flex-shrink-0 font-mono text-[14px] tabular ${t.type === 'income' ? 'text-leaf' : neutral ? 'text-ink-3' : 'text-ink'}`}>
                          {t.amount > 0 ? '+' : '−'}
                          {formatEuro(Math.abs(t.amount))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {data && data.total > data.transactions.length && (
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="btn-ghost mt-2 w-full" disabled={loading}>
            {loading ? 'Lädt…' : `Weitere ${Math.min(PAGE, data.total - data.transactions.length)} laden`}
          </button>
        )}
      </div>

      <TransactionEditModal
        transaction={editing}
        onClose={() => setEditing(null)}
        onSaved={onChanged}
        onDelete={(id) => {
          onDelete(id);
          setData((d) => (d ? { ...d, total: d.total - 1, transactions: d.transactions.filter((t) => t.id !== id) } : d));
        }}
      />
    </section>
  );
}
