'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Flame, PiggyBank, Scale, Trophy } from 'lucide-react';
import { ForecastLine, MonthlyBars, Progress, Sparkbars } from '@/components/wealth/charts';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/client';
import { formatEuro } from '@/lib/format';
import type { Macros } from '@/lib/nutrition/types';
import type { NutritionStats as Stats } from '@/lib/nutrition/views';
import { fmtNum } from './shared';

interface NutritionStatsProps {
  /** Changes whenever a log or plan changed, so the numbers reload. */
  refreshKey: string;
}

const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)} %`);

function Tile({ label, value, sub, children }: { label: string; value: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-inset p-3">
      <p className="eyebrow text-[10px]">{label}</p>
      <p className="mt-1 font-mono text-[20px] font-semibold leading-none text-ink tabular">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-ink-3">{sub}</p>}
      {children}
    </div>
  );
}

const avgLine = (m: Macros | null) => (m ? `${fmtNum(m.kcal)} kcal · ${fmtNum(m.protein)} g P` : 'noch keine Einträge');

export function NutritionStats({ refreshKey }: NutritionStatsProps) {
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setStats(await api<Stats>('/api/v1/nutrition/stats'));
    } catch (error) {
      toast(`Statistik: ${errorMessage(error)}`, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const saveBody = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/v1/nutrition/body', { body: { weightKg: weight || undefined, waistCm: waist || undefined } });
      setWeight('');
      setWaist('');
      toast('Messung gespeichert');
      load();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!stats) {
    return (
      <section className="card card-pad" aria-label="Statistik">
        <p className="eyebrow">Statistik</p>
        <p className="mt-3 text-[14px] text-ink-3">Lädt…</p>
      </section>
    );
  }

  const last14 = stats.days.slice(-14);
  const spend = stats.spending;
  const weights = stats.body.filter((b) => b.weightKg !== null);
  const waists = stats.body.filter((b) => b.waistCm !== null);
  const dateLabel = (d: string) => `${d.slice(8)}.${d.slice(5, 7)}.`;

  return (
    <section className="card" aria-label="Statistik">
      <div className="p-4 pb-2 sm:p-5 sm:pb-2">
        <p className="eyebrow">Verlauf</p>
        <h2 className="card-title mt-1">Statistik</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pt-2 sm:px-5 lg:grid-cols-4">
        <Tile label="Ø 7 Tage" value={stats.avg7 ? fmtNum(stats.avg7.kcal) : '–'} sub={avgLine(stats.avg7)} />
        <Tile label="Ø 30 Tage" value={stats.avg30 ? fmtNum(stats.avg30.kcal) : '–'} sub={avgLine(stats.avg30)} />
        <Tile label="Nach Plan" value={pct(stats.adherence7)} sub={`7 Tage · 30 Tage ${pct(stats.adherence30)}`} />
        <Tile
          label="Protein-Streak"
          value={
            <span className="inline-flex items-center gap-1.5">
              {stats.streak} <Flame className={`h-5 w-5 ${stats.streak > 0 ? 'text-warn' : 'text-ink-3'}`} />
            </span>
          }
          sub={`Tage mit ≥ ${stats.targets.proteinMin} g`}
        />
      </div>

      <div className="grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Wochenziel: Protein an {stats.week.target} Tagen
          </p>
          <Progress value={stats.week.proteinDays / stats.week.target} tone={stats.week.proteinDays >= stats.week.target ? 'leaf' : 'accent'} />
          <p className="mt-1 font-mono text-[13px] text-ink-2 tabular">
            {stats.week.proteinDays} / {stats.week.target} Tage
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="eyebrow mb-1 text-[10px]">Protein · 14 Tage</p>
            <Sparkbars values={last14.map((d) => d.protein)} className="h-10" />
          </div>
          <div>
            <p className="eyebrow mb-1 text-[10px]">kcal · 14 Tage</p>
            <Sparkbars values={last14.map((d) => d.kcal)} className="h-10" />
          </div>
        </div>
      </div>

      <div className="border-t border-line/10 px-4 py-4 sm:px-5">
        <p className="eyebrow mb-2">Lebensmittel: Plan vs. echte Ausgaben</p>
        {spend.hasBankData ? (
          <MonthlyBars
            months={spend.weeks.map((w, i) => ({
              key: w.weekStart,
              label: w.label,
              income: w.planned ?? 0,
              expenses: w.groceries,
              net: (w.planned ?? 0) - w.groceries,
              isCurrent: i === spend.weeks.length - 1,
            }))}
            legend={{ income: 'Plan', expenses: 'Echt', netLabel: 'Plan − Echt' }}
          />
        ) : (
          <p className="text-[14px] text-ink-3">Verbinde eine Bank oder importiere Umsätze (Kategorie „Lebensmittel“), dann siehst du hier Plan und Wirklichkeit.</p>
        )}
      </div>

      <div className="grid gap-2 border-t border-line/10 px-4 py-4 sm:grid-cols-3 sm:px-5">
        <Tile
          label="Essen gehen vorher"
          value={spend.eatingOutBefore === null ? '–' : formatEuro(spend.eatingOutBefore)}
          sub={spend.eatingOutBefore === null ? 'keine Umsätze vor dem Start' : 'pro Woche, 8 Wochen vor Meal Prep'}
        />
        <Tile label="Essen gehen jetzt" value={formatEuro(spend.eatingOutSince ?? 0)} sub={`pro Woche seit ${fmtNum(spend.weeksSince, 1)} Wochen`} />
        <Tile
          label="Gespart"
          value={
            <span className="inline-flex items-center gap-1.5 text-leaf">
              <PiggyBank className="h-5 w-5" /> {spend.saved === null ? '–' : formatEuro(spend.saved, 0)}
            </span>
          }
          sub="weniger Mäci & Co. seit dem Start"
        />
      </div>

      <div className="grid gap-4 border-t border-line/10 px-4 py-4 sm:px-5 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-1">Kosten pro 10 g Protein</p>
          <p className="font-mono text-[24px] font-semibold text-ink tabular">{stats.costPer10gProtein === null ? '–' : formatEuro(stats.costPer10gProtein)}</p>
          <p className="text-[12px] text-ink-3">im Plan dieser Woche · zum Vergleich: Burger-Menü ≈ 3 € pro 10 g</p>
          <ul className="mt-2 space-y-1">
            {stats.cheapestProtein.map((r) => (
              <li key={r.recipeId} className="flex justify-between gap-2 text-[13px]">
                <span className="truncate text-ink-2">{r.name}</span>
                <span className="flex-shrink-0 font-mono text-ink-3 tabular">{formatEuro(r.value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-1">Am öftesten gegessen</p>
          {stats.topRecipes.length === 0 ? (
            <p className="text-[13px] text-ink-3">Noch nichts abgehakt.</p>
          ) : (
            <ol className="space-y-1">
              {stats.topRecipes.map((r, i) => (
                <li key={r.recipeId} className="flex justify-between gap-2 text-[13px]">
                  <span className="truncate text-ink">
                    <span className="mr-1.5 font-mono text-ink-3">{i + 1}.</span>
                    {r.name}
                  </span>
                  <span className="flex-shrink-0 font-mono text-ink-3 tabular">{r.count}×</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="border-t border-line/10 px-4 py-4 sm:px-5">
        <p className="eyebrow mb-2 flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5" /> Recomp-Verlauf (optional, 1× pro Woche)
        </p>
        <form onSubmit={saveBody} className="flex flex-wrap items-end gap-2">
          <div className="w-28">
            <label htmlFor="body-weight" className="field-label">
              Gewicht kg
            </label>
            <input id="body-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="67,0" className="field-input h-10 py-0 font-mono" />
          </div>
          <div className="w-28">
            <label htmlFor="body-waist" className="field-label">
              Taille cm
            </label>
            <input id="body-waist" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="78" className="field-input h-10 py-0 font-mono" />
          </div>
          <button type="submit" disabled={saving || (!weight && !waist)} className="btn-secondary">
            Eintragen
          </button>
        </form>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {weights.length >= 2 && (
            <div>
              <p className="mb-1 text-[12px] font-bold text-ink-2">Gewicht</p>
              <ForecastLine points={weights.map((b) => ({ label: dateLabel(b.day), balance: b.weightKg! }))} unit="kg" digits={1} fromZero={false} dashed={false} label="Gewicht" />
            </div>
          )}
          {waists.length >= 2 && (
            <div>
              <p className="mb-1 text-[12px] font-bold text-ink-2">Taillenumfang</p>
              <ForecastLine points={waists.map((b) => ({ label: dateLabel(b.day), balance: b.waistCm! }))} unit="cm" digits={1} fromZero={false} dashed={false} label="Taillenumfang" />
            </div>
          )}
          {weights.length < 2 && waists.length < 2 && (
            <p className="text-[13px] text-ink-3">Ab zwei Messungen siehst du hier den Verlauf. Bei Recomp bleibt das Gewicht oft gleich, während die Taille schmaler wird.</p>
          )}
        </div>
      </div>
    </section>
  );
}
