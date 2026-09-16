'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChevronDown,
  Info,
  LineChart,
  ListFilter,
  RefreshCw,
  Sparkles,
  Target,
  ThumbsUp,
  Upload,
} from 'lucide-react';
import type { AnalyticsRange, CategoryAnalysis, FinanceAnalytics, FinanceInsight } from '@/types';
import { api, errorMessage } from '@/lib/client';
import { formatEuro, relativeDayLabel } from '@/lib/format';
import { EXPENSE_CATEGORIES, categoryMeta } from '@/lib/finance/categories';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Donut, ForecastLine, MonthlyBars, Progress, Sparkbars, WeekdayBars } from './charts';
import { TransactionEditModal, type EditableTransaction } from './TransactionEditModal';

export interface TransactionFilter {
  category?: string;
  from?: string;
  to?: string;
  q?: string;
}

interface FinanceAnalysisProps {
  /** Changes whenever bookings change, so the analysis reloads. */
  refreshKey: string;
  onChanged: () => void;
  onShowTransactions: (filter: TransactionFilter) => void;
  onImport: () => void;
  onAddTransaction: () => void;
}

const RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: 'month', label: 'Monat' },
  { id: 'last-month', label: 'Vormonat' },
  { id: '3m', label: '3 M' },
  { id: '6m', label: '6 M' },
  { id: '12m', label: '12 M' },
];

const INTERVAL_LABELS = { weekly: 'wöchentlich', monthly: 'monatlich', quarterly: 'vierteljährlich', yearly: 'jährlich' };
const RANGE_KEY = 'lifetracker:analytics-range';

export const FOOD_FILTER = 'Lebensmittel,Essen gehen,Essen';

const eur0 = (n: number) => formatEuro(n, 0);

function Change({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || !Number.isFinite(value) || Math.abs(value) < 0.01) return null;
  const up = value > 0;
  // For expenses "up" is bad; for income it's good.
  const bad = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[12px] font-medium tabular ${bad ? 'text-pen' : 'text-leaf'}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(Math.round(value * 100))} %
    </span>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: React.ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="card min-w-0 px-4 py-3.5">
      <p className="eyebrow text-[11px]">{label}</p>
      <p className={`mt-1 truncate font-mono text-[22px] font-medium tabular sm:text-[26px] ${tone === 'good' ? 'text-leaf' : tone === 'bad' ? 'text-pen' : 'text-ink'}`}>{value}</p>
      {sub && <div className="mt-0.5 flex min-h-[18px] flex-wrap items-center gap-x-1.5 text-[12px] text-ink-3">{sub}</div>}
    </div>
  );
}

const INSIGHT_STYLE: Record<FinanceInsight['tone'], { Icon: typeof Info; className: string }> = {
  warn: { Icon: AlertTriangle, className: 'bg-warn/15 text-warn' },
  good: { Icon: ThumbsUp, className: 'bg-leaf/15 text-leaf' },
  info: { Icon: Info, className: 'bg-accent/15 text-accent' },
};

function CardHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="card-title mt-1">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function FinanceAnalysis({ refreshKey, onChanged, onShowTransactions, onImport, onAddTransaction }: FinanceAnalysisProps) {
  const toast = useToast();
  const [range, setRange] = useState<AnalyticsRange>('month');
  const [data, setData] = useState<FinanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [editing, setEditing] = useState<EditableTransaction | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RANGE_KEY) as AnalyticsRange | null;
      if (stored && RANGES.some((r) => r.id === stored)) setRange(stored);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api<FinanceAnalytics>(`/api/v1/finance/analytics?range=${range}`));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const chooseRange = (id: AnalyticsRange) => {
    setRange(id);
    setOpenCategory(null);
    try {
      localStorage.setItem(RANGE_KEY, id);
    } catch {
      // ignore
    }
  };

  const toolbar = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="segmented grid-cols-5" role="group" aria-label="Zeitraum">
        {RANGES.map((r) => (
          <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => chooseRange(r.id)} className="segmented-item px-2.5 sm:px-3.5">
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {data && <span className="text-[14px] font-bold capitalize text-ink-2">{data.label}</span>}
        <button type="button" onClick={() => setBudgetsOpen(true)} className="btn-secondary h-9 px-3" disabled={!data}>
          <Target className="h-4 w-4" /> Budgets
        </button>
        <button type="button" onClick={load} className="icon-btn" aria-label="Neu berechnen" title="Neu berechnen">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );

  if (error && !data) {
    return (
      <div>
        {toolbar}
        <div className="card p-8 text-center">
          <p className="text-[15px] text-pen">{error}</p>
          <button type="button" onClick={load} className="btn-secondary mt-3">
            Nochmal versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        {toolbar}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card h-[98px] animate-pulse" />
          ))}
        </div>
        <div className="card mt-4 h-72 animate-pulse" />
      </div>
    );
  }

  if (!data.hasData) {
    return (
      <div>
        {toolbar}
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <LineChart className="h-8 w-8 text-accent" />
          <h2 className="card-title">Noch nichts zu analysieren</h2>
          <p className="max-w-md text-[14px] text-ink-2">
            Importiere Umsätze von George, Trade Republic oder Finanzguru – oder trag Ausgaben selbst ein. Dann siehst du hier, wofür dein Geld draufgeht, eine Prognose und deine Abos.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onImport} className="btn-primary">
              <Upload className="h-4 w-4" /> Umsätze importieren
            </button>
            <button type="button" onClick={onAddTransaction} className="btn-secondary">
              Buchung erfassen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { totals, previous, forecast } = data;
  const hasPrev = previous.expenses > 0 || previous.income > 0;
  const expenseChange = hasPrev && previous.expenses > 0 ? (totals.expenses - previous.expenses) / previous.expenses : null;
  const incomeChange = hasPrev && previous.income > 0 ? (totals.income - previous.income) / previous.income : null;
  const isMonth = data.range === 'month';

  // Donut: top 6 categories + rest.
  const top = data.categories.filter((c) => c.amount > 0);
  const donut = top.slice(0, 6).map((c) => ({ label: c.category, value: c.amount, color: categoryMeta(c.category).color }));
  const rest = top.slice(6).reduce((sum, c) => sum + c.amount, 0);
  if (rest > 0) donut.push({ label: 'Weitere', value: rest, color: '#94A3B8' });
  const visibleCategories = showAllCategories ? data.categories : data.categories.slice(0, 8);

  const recurringExpenses = data.recurring.filter((r) => r.type === 'expense');
  const recurringIncome = data.recurring.filter((r) => r.type === 'income');
  const budgetUse = forecast.budget > 0 ? forecast.projectedDiscretionary / forecast.budget : null;

  const openTx = (t: FinanceAnalytics['topExpenses'][number]) =>
    setEditing({ id: t.id, title: t.title, amount: -t.amount, category: t.category, type: t.type, isRecurring: t.isRecurring, date: t.date, account: t.account, counterparty: t.counterparty });

  return (
    <div className={loading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
      {toolbar}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Ausgaben"
          value={eur0(totals.expenses)}
          sub={
            <>
              <Change value={expenseChange} />
              {expenseChange !== null && <span>vs. davor</span>}
            </>
          }
        />
        <Kpi
          label="Einnahmen"
          value={eur0(totals.income)}
          sub={
            <>
              <Change value={incomeChange} invert />
              {incomeChange !== null && <span>vs. davor</span>}
            </>
          }
        />
        <Kpi
          label="Übrig"
          value={`${totals.net >= 0 ? '+' : '−'}${eur0(Math.abs(totals.net))}`}
          tone={totals.net >= 0 ? 'good' : 'bad'}
          sub={totals.savingsRate !== null ? <span>Sparquote {Math.round(totals.savingsRate * 100)} %</span> : <span>keine Einnahmen</span>}
        />
        <Kpi
          label="Pro Tag"
          value={formatEuro(totals.avgPerDay)}
          sub={<span>{isMonth ? `≈ ${eur0(totals.avgPerMonth)} aufs Monat` : `Ø ${eur0(totals.avgPerMonth)} / Monat`}</span>}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-6 lg:grid lg:grid-cols-12 lg:items-start">
        {/* ------------------------------------------------ left column */}
        <div className="contents lg:col-span-7 lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          {/* Forecast */}
          <section className="card order-2 min-w-0" aria-label="Prognose">
            <CardHeader eyebrow="Prognose" title={`Ende ${format(new Date(), 'MMMM', { locale: de })}`} />
            <div className="px-4 pb-5 sm:px-5">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <p className="text-[13px] text-ink-3">Kontostand voraussichtlich</p>
                  <p className={`font-mono text-[32px] font-medium leading-tight tabular ${forecast.endOfMonthBalance < 0 ? 'text-pen' : 'text-ink'}`}>
                    {formatEuro(forecast.endOfMonthBalance, 0)}
                  </p>
                  <p className="text-[13px] text-ink-2">
                    jetzt {formatEuro(forecast.balance, 0)} · noch {forecast.daysLeft} {forecast.daysLeft === 1 ? 'Tag' : 'Tage'}
                  </p>
                </div>
                <dl className="grid w-full grid-cols-2 gap-3 text-[13px] sm:w-auto sm:min-w-[260px] sm:flex-1">
                  <div>
                    <dt className="text-ink-3">Ausgaben im Monat</dt>
                    <dd className="font-mono text-[16px] font-medium text-ink tabular">{eur0(forecast.projectedExpenses)}</dd>
                    <dd className="text-[12px] text-ink-3">bisher {eur0(forecast.spentSoFar)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Einnahmen im Monat</dt>
                    <dd className="font-mono text-[16px] font-medium text-ink tabular">{eur0(forecast.projectedIncome)}</dd>
                    <dd className="text-[12px] text-ink-3">bisher {eur0(forecast.incomeSoFar)}</dd>
                  </div>
                </dl>
              </div>

              {budgetUse !== null && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="font-bold text-ink">Monatsbudget</span>
                    <span className="font-mono text-ink-2 tabular">
                      {eur0(forecast.projectedDiscretionary)} von {eur0(forecast.budget)}
                    </span>
                  </div>
                  <Progress value={budgetUse} tone={budgetUse > 1 ? 'pen' : budgetUse > 0.9 ? 'warn' : 'leaf'} />
                  <p className="mt-1.5 text-[12px] text-ink-3">
                    Hochgerechnet mit {formatEuro(forecast.dailyPace)} pro Tag (ohne Fixkosten, aus deinem Tempo und den letzten Monaten).
                  </p>
                </div>
              )}

              {forecast.pending.length > 0 && (
                <div className="mt-4">
                  <p className="field-label mb-1.5">Kommt diesen Monat noch</p>
                  <ul className="divide-y divide-line/10 rounded-[10px] border border-line/10">
                    {forecast.pending.slice(0, 6).map((p, i) => (
                      <li key={`${p.name}-${i}`} className="flex items-center gap-3 px-3 py-2 text-[14px]">
                        <CalendarClock className="h-4 w-4 flex-shrink-0 text-ink-3" />
                        <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
                        <span className="text-[12px] text-ink-3">{relativeDayLabel(new Date(p.date))}</span>
                        <span className={`font-mono tabular ${p.type === 'income' ? 'text-leaf' : 'text-ink'}`}>
                          {p.type === 'income' ? '+' : '−'}
                          {formatEuro(p.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5">
                <p className="field-label mb-1">Kontostand in den nächsten Monaten</p>
                <ForecastLine points={forecast.points} />
                <p className="mt-2 text-[12px] text-ink-3">
                  Annahme: du behältst wie zuletzt im Schnitt{' '}
                  <b className={forecast.avgMonthlyNet >= 0 ? 'text-leaf' : 'text-pen'}>
                    {forecast.avgMonthlyNet >= 0 ? '+' : '−'}
                    {eur0(Math.abs(forecast.avgMonthlyNet))}
                  </b>{' '}
                  pro Monat übrig (ohne Investments).
                </p>
              </div>
            </div>
          </section>

          {/* Categories */}
          <section className="card order-3 min-w-0" aria-label="Kategorien">
            <CardHeader
              eyebrow="Kategorien"
              title="Wofür geht's drauf?"
              action={
                <button type="button" onClick={() => onShowTransactions({ from: data.from, to: data.to })} className="btn-ghost h-9 px-2 text-[13px]">
                  <ListFilter className="h-4 w-4" /> Buchungen
                </button>
              }
            />
            {data.categories.length === 0 ? (
              <p className="px-5 pb-6 pt-2 text-[14px] text-ink-3">Keine Ausgaben in diesem Zeitraum.</p>
            ) : (
              <div className="px-4 pb-3 sm:px-5">
                <div className="flex flex-col items-center gap-5 py-2 sm:flex-row sm:items-center">
                  <Donut segments={donut}>
                    <span className="font-mono text-[20px] font-medium text-ink tabular">{eur0(totals.expenses)}</span>
                    <span className="text-[11px] font-bold uppercase text-ink-3">Ausgaben</span>
                  </Donut>
                  <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                    {donut.map((s) => (
                      <li key={s.label} className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
                        <span className="min-w-0 flex-1 truncate text-ink-2">{s.label}</span>
                        <span className="font-mono text-ink-3 tabular">{Math.round((s.value / Math.max(1, totals.expenses)) * 100)} %</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <ul className="mt-2 divide-y divide-line/10">
                  {visibleCategories.map((c) => (
                    <CategoryRow
                      key={c.category}
                      c={c}
                      isMonth={isMonth || data.range === 'last-month'}
                      open={openCategory === c.category}
                      onToggle={() => setOpenCategory((cur) => (cur === c.category ? null : c.category))}
                      onShow={() => onShowTransactions({ category: c.category, from: data.from, to: data.to })}
                      onBudget={() => setBudgetsOpen(true)}
                    />
                  ))}
                </ul>
                {data.categories.length > 8 && (
                  <button type="button" onClick={() => setShowAllCategories((v) => !v)} className="btn-ghost mb-1 w-full">
                    {showAllCategories ? 'Weniger anzeigen' : `Alle ${data.categories.length} Kategorien`}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* History */}
          <section className="card order-6 min-w-0" aria-label="Verlauf">
            <CardHeader eyebrow="Verlauf" title="Letzte 12 Monate" />
            <div className="px-4 pb-5 sm:px-5">
              <MonthlyBars months={data.monthly} />
            </div>
          </section>
        </div>

        {/* ------------------------------------------------ right column */}
        <div className="contents lg:col-span-5 lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          {data.insights.length > 0 && (
            <section className="card order-1 min-w-0" aria-label="Hinweise">
              <CardHeader eyebrow="Auffällig" title="Hinweise" action={<Sparkles className="h-5 w-5 text-accent" />} />
              <ul className="space-y-2 px-4 pb-4 sm:px-5">
                {data.insights.map((insight, i) => {
                  const { Icon, className } = INSIGHT_STYLE[insight.tone];
                  return (
                    <li key={i} className="flex gap-3 rounded-[10px] border border-line/10 p-3">
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${className}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold text-ink">{insight.title}</span>
                        <span className="block text-[13px] text-ink-2">{insight.text}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Food */}
          <section className="card order-4 min-w-0" aria-label="Essen">
            <CardHeader
              eyebrow="Genauer hingeschaut"
              title="Essen & Trinken"
              action={
                data.food.total > 0 ? (
                  <button type="button" onClick={() => onShowTransactions({ category: FOOD_FILTER, from: data.from, to: data.to })} className="btn-ghost h-9 px-2 text-[13px]">
                    Details
                  </button>
                ) : undefined
              }
            />
            {data.food.total === 0 ? (
              <p className="px-5 pb-6 pt-1 text-[14px] text-ink-3">Keine Ausgaben für Essen in diesem Zeitraum.</p>
            ) : (
              <div className="px-4 pb-5 sm:px-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-[28px] font-medium leading-tight text-ink tabular">{eur0(data.food.total)}</p>
                    <p className="text-[13px] text-ink-2">
                      {formatEuro(data.food.perDay)} pro Tag · {Math.round(data.food.share * 100)} % deiner Ausgaben
                    </p>
                  </div>
                  {data.food.previous > 0 && (
                    <span className="text-[12px] text-ink-3">
                      davor {eur0(data.food.previous)} <Change value={(data.food.total - data.food.previous) / data.food.previous} />
                    </span>
                  )}
                </div>
                {(data.food.groceries > 0 || data.food.eatingOut > 0) && (
                  <div className="mt-4">
                    <div className="flex h-3 overflow-hidden rounded-full bg-inset">
                      <span style={{ width: `${(data.food.groceries / data.food.total) * 100}%`, backgroundColor: categoryMeta('Lebensmittel').color }} />
                      <span style={{ width: `${(data.food.eatingOut / data.food.total) * 100}%`, backgroundColor: categoryMeta('Essen gehen').color }} />
                    </div>
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-[13px]">
                      <span className="text-ink-2">🛒 Supermarkt {eur0(data.food.groceries)}</span>
                      <span className="text-ink-2">🍔 Unterwegs & bestellt {eur0(data.food.eatingOut)}</span>
                    </div>
                  </div>
                )}
                {data.food.topPlaces.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {data.food.topPlaces.map((p) => (
                      <li key={p.name} className="flex items-center gap-2 text-[14px]">
                        <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
                        <span className="text-[12px] text-ink-3">{p.count}×</span>
                        <span className="w-20 text-right font-mono text-ink tabular">{eur0(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Top expenses */}
          <section className="card order-5 min-w-0" aria-label="Größte Ausgaben">
            <CardHeader eyebrow="Top 10" title="Größte Ausgaben" />
            {data.topExpenses.length === 0 ? (
              <p className="px-5 pb-6 pt-1 text-[14px] text-ink-3">Keine Ausgaben in diesem Zeitraum.</p>
            ) : (
              <ol className="px-2 pb-3 sm:px-3">
                {data.topExpenses.map((t, i) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => openTx(t)} className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left hover:bg-inset">
                      <span className="w-5 text-right font-mono text-[12px] text-ink-3">{i + 1}</span>
                      <span className="text-[18px]" aria-hidden>
                        {categoryMeta(t.category).emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-ink">{t.title}</span>
                        <span className="block truncate text-[12px] text-ink-3">
                          {format(new Date(t.date), 'd. MMM', { locale: de })} · {t.category}
                        </span>
                      </span>
                      <span className="font-mono text-[14px] text-ink tabular">{formatEuro(t.amount)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Recurring */}
          <section className="card order-7 min-w-0" aria-label="Abos">
            <CardHeader eyebrow="Automatisch erkannt" title="Abos & regelmäßige Zahlungen" />
            {data.recurring.length === 0 ? (
              <p className="px-5 pb-6 pt-1 text-[14px] text-ink-3">
                Noch nichts erkannt. Dafür braucht es mindestens drei gleiche Zahlungen – oder markiere eine Buchung als „Regelmäßig“.
              </p>
            ) : (
              <div className="px-4 pb-4 sm:px-5">
                {recurringExpenses.length > 0 && (
                  <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line/10 bg-line/10">
                    <div className="bg-sheet px-3 py-2">
                      <p className="eyebrow text-[11px]">Pro Monat</p>
                      <p className="font-mono text-[18px] font-medium text-ink tabular">{formatEuro(data.recurringMonthly)}</p>
                    </div>
                    <div className="bg-sheet px-3 py-2">
                      <p className="eyebrow text-[11px]">Pro Jahr</p>
                      <p className="font-mono text-[18px] font-medium text-ink tabular">{eur0(data.recurringMonthly * 12)}</p>
                    </div>
                  </div>
                )}
                <ul className="divide-y divide-line/10">
                  {[...recurringExpenses, ...recurringIncome].map((r) => (
                    <li key={r.key} className="flex items-center gap-3 py-2.5">
                      <span className="text-[18px]" aria-hidden>
                        {categoryMeta(r.category).emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-bold text-ink">{r.name}</span>
                          {r.priceChange && r.priceChange.to > r.priceChange.from && r.type === 'expense' && <span className="chip bg-pen/10 text-[11px] text-pen">teurer</span>}
                        </span>
                        <span className="block truncate text-[12px] text-ink-3">
                          {INTERVAL_LABELS[r.interval]} · nächste {relativeDayLabel(new Date(r.nextDate))}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className={`block font-mono text-[14px] tabular ${r.type === 'income' ? 'text-leaf' : 'text-ink'}`}>
                          {r.type === 'income' ? '+' : ''}
                          {formatEuro(r.amount)}
                        </span>
                        {r.interval !== 'monthly' && <span className="block text-[11px] text-ink-3">≈ {formatEuro(r.monthlyAmount)}/M</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Merchants & weekdays */}
          <section className="card order-8 min-w-0" aria-label="Händler">
            <CardHeader eyebrow="Wo" title="Hier gibst du am meisten aus" />
            {data.merchants.length === 0 ? (
              <p className="px-5 pb-6 pt-1 text-[14px] text-ink-3">Keine Ausgaben in diesem Zeitraum.</p>
            ) : (
              <ul className="space-y-2 px-4 pb-4 sm:px-5">
                {data.merchants.map((m) => (
                  <li key={m.name}>
                    <button type="button" onClick={() => onShowTransactions({ q: m.name, from: data.from, to: data.to })} className="w-full text-left">
                      <span className="flex items-center gap-2 text-[14px]">
                        <span className="min-w-0 flex-1 truncate font-bold text-ink">{m.name}</span>
                        <span className="text-[12px] text-ink-3">{m.count}×</span>
                        <span className="w-20 text-right font-mono text-ink tabular">{eur0(m.amount)}</span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-inset">
                        <span className="block h-full rounded-full" style={{ width: `${(m.amount / data.merchants[0].amount) * 100}%`, backgroundColor: categoryMeta(m.category).color }} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card order-9 min-w-0" aria-label="Wochentage">
            <CardHeader eyebrow="Wann" title="Ausgaben pro Wochentag" />
            <div className="px-4 pb-5 sm:px-5">
              <WeekdayBars days={data.weekdays} />
              <p className="mt-2 text-[12px] text-ink-3">Durchschnitt pro Tag in Euro.</p>
            </div>
          </section>
        </div>
      </div>

      <BudgetsModal
        isOpen={budgetsOpen}
        onClose={() => setBudgetsOpen(false)}
        analytics={data}
        onSaved={() => {
          toast('Budgets gespeichert');
          load();
        }}
      />

      <TransactionEditModal
        transaction={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          onChanged();
          load();
        }}
      />
    </div>
  );
}

function CategoryRow({
  c,
  isMonth,
  open,
  onToggle,
  onShow,
  onBudget,
}: {
  c: CategoryAnalysis;
  isMonth: boolean;
  open: boolean;
  onToggle: () => void;
  onShow: () => void;
  onBudget: () => void;
}) {
  const meta = categoryMeta(c.category);
  const budgetUse = c.budget ? c.perMonth / c.budget : null;
  return (
    <li className="py-1">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 rounded-[10px] py-2 text-left">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[18px]" style={{ backgroundColor: `${meta.color}22` }} aria-hidden>
          {meta.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-bold text-ink">{c.category}</span>
            <Change value={c.change} />
          </span>
          {budgetUse !== null ? (
            <span className="mt-1 block">
              <Progress value={budgetUse} tone={budgetUse > 1 ? 'pen' : budgetUse > 0.8 ? 'warn' : 'leaf'} className="h-1.5" />
              <span className="mt-0.5 block text-[11px] text-ink-3">
                {isMonth ? `${Math.round(c.perMonth)} von ${Math.round(c.budget!)} € Budget` : `Ø ${Math.round(c.perMonth)} € / Monat bei ${Math.round(c.budget!)} € Budget`}
              </span>
            </span>
          ) : (
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-inset">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(2, c.share * 100)}%`, backgroundColor: meta.color }} />
            </span>
          )}
        </span>
        <span className="text-right">
          <span className="block font-mono text-[15px] font-medium text-ink tabular">{eur0(c.amount)}</span>
          <span className="block text-[11px] text-ink-3">
            {Math.round(c.share * 100)} % · {c.count}×
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-ink-3 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mb-2 ml-12 rounded-[10px] bg-inset p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] text-ink-2">
              <p>
                Ø letzte 6 Monate: <b className="font-mono tabular">{formatEuro(c.avgMonthly, 0)}</b> / Monat
              </p>
              {c.previous > 0 && (
                <p>
                  Zeitraum davor: <b className="font-mono tabular">{formatEuro(c.previous, 0)}</b>
                </p>
              )}
            </div>
            <span className="flex flex-col items-end">
              <Sparkbars values={c.trend} />
              <span className="text-[10px] text-ink-3">7 Monate</span>
            </span>
          </div>
          {c.merchants.length > 0 && (
            <ul className="mt-3 space-y-1">
              {c.merchants.map((m) => (
                <li key={m.name} className="flex items-center gap-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-ink">{m.name}</span>
                  <span className="text-ink-3">{m.count}×</span>
                  <span className="w-16 text-right font-mono text-ink tabular">{formatEuro(m.amount, 0)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onShow} className="btn-secondary h-8 px-3 text-[13px]">
              Buchungen ansehen
            </button>
            <button type="button" onClick={onBudget} className="btn-ghost h-8 px-3 text-[13px]">
              <Target className="h-3.5 w-3.5" /> {c.budget ? 'Budget ändern' : 'Budget setzen'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function BudgetsModal({ isOpen, onClose, analytics, onSaved }: { isOpen: boolean; onClose: () => void; analytics: FinanceAnalytics; onSaved: () => void }) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const categories = [...new Set<string>([...EXPENSE_CATEGORIES.filter((c) => c !== 'Sonstiges'), ...analytics.categories.map((c) => c.category), 'Sonstiges'])];
  const avg = new Map(analytics.categories.map((c) => [c.category, c.avgMonthly]));
  const current = new Map(analytics.budgets.map((b) => [b.category, b.limit]));

  useEffect(() => {
    if (!isOpen) return;
    setValues(Object.fromEntries(analytics.budgets.map((b) => [b.category, String(b.limit).replace('.', ',')])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const save = async () => {
    setSaving(true);
    try {
      for (const category of categories) {
        const raw = (values[category] ?? '').trim();
        const next = raw ? parseFloat(raw.replace(',', '.')) : 0;
        if (!Number.isFinite(next) || next < 0) throw new Error(`Ungültiger Betrag bei ${category}`);
        if ((current.get(category) ?? 0) === next) continue;
        await api('/api/v1/finance/budgets', { method: 'PUT', body: { category, limit: next } });
      }
      onSaved();
      onClose();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title="Budgets pro Kategorie"
      subtitle="Monatliches Limit – leer lassen für kein Budget"
      icon={<Target className="h-[18px] w-[18px]" />}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Abbrechen
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </>
      }
    >
      <ul className="space-y-2">
        {categories.map((category) => {
          const average = avg.get(category) ?? 0;
          return (
            <li key={category} className="flex items-center gap-3">
              <span className="text-[18px]" aria-hidden>
                {categoryMeta(category).emoji}
              </span>
              <label htmlFor={`budget-${category}`} className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold text-ink">{category}</span>
                {average > 0 && <span className="block text-[12px] text-ink-3">Ø {formatEuro(average, 0)} / Monat</span>}
              </label>
              <div className="relative w-28">
                <input
                  id={`budget-${category}`}
                  inputMode="decimal"
                  value={values[category] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [category]: e.target.value }))}
                  placeholder={average > 0 ? String(Math.ceil(average / 10) * 10) : '–'}
                  className="field-input h-10 pr-7 text-right font-mono"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">€</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
