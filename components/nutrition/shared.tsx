'use client';

import React from 'react';
import { Clock, PartyPopper, Refrigerator, Snowflake } from 'lucide-react';
import { Donut } from '@/components/wealth/charts';
import { formatEuro } from '@/lib/format';
import type { Macros } from '@/lib/nutrition/types';
import type { NutritionFacts } from '@/lib/nutrition/views';
import type { Storage } from '@/lib/nutrition/plan';

export const fmtNum = (n: number, digits = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "560 kcal · 42 g P · 1,95 €" – the one line every meal carries. */
export function MacroLine({ n, cost = true, className = '' }: { n: Macros & { cost?: number }; cost?: boolean; className?: string }) {
  return (
    <span className={`font-mono text-[12px] text-ink-3 tabular ${className}`}>
      {fmtNum(n.kcal)} kcal · {fmtNum(n.protein)} g P
      {cost && n.cost !== undefined && <> · {formatEuro(n.cost)}</>}
    </span>
  );
}

/** Full split for detail views. */
export function MacroTable({ n }: { n: NutritionFacts }) {
  const cells: [string, string][] = [
    ['kcal', fmtNum(n.kcal)],
    ['Protein', `${fmtNum(n.protein)} g`],
    ['Kohlenh.', `${fmtNum(n.carbs)} g`],
    ['Fett', `${fmtNum(n.fat)} g`],
    ['Kosten', formatEuro(n.cost)],
  ];
  return (
    <dl className="grid grid-cols-5 gap-1 rounded-[10px] bg-inset p-2 text-center">
      {cells.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">{label}</dt>
          <dd className="font-mono text-[13px] font-medium text-ink tabular">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Progress ring built on the finance Donut: filled share of a daily target. */
export function TargetRing({
  value,
  target,
  label,
  unit,
  size = 104,
  tone = 'accent',
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  size?: number;
  tone?: 'accent' | 'leaf';
}) {
  const color = tone === 'leaf' ? 'rgb(var(--leaf))' : 'rgb(var(--accent))';
  const done = Math.min(value, target);
  const segments = value >= target ? [{ label, value: 1, color }] : [{ label, value: done, color }, { label: 'offen', value: Math.max(0, target - done), color: 'transparent' }];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Donut segments={segments} size={size} thickness={10}>
        <span className="font-mono text-[18px] font-semibold leading-none text-ink tabular">{fmtNum(value)}</span>
        <span className="mt-0.5 font-mono text-[11px] text-ink-3 tabular">
          / {fmtNum(target)} {unit}
        </span>
      </Donut>
      <span className="eyebrow text-[11px]">{label}</span>
    </div>
  );
}

export const STORAGE_META: Record<Storage, { label: string; Icon: typeof Clock; className: string }> = {
  fridge: { label: 'Kühlschrank', Icon: Refrigerator, className: 'text-accent' },
  freezer: { label: 'Tiefkühl', Icon: Snowflake, className: 'text-[rgb(56_189_248)]' },
  fresh: { label: 'frisch', Icon: Clock, className: 'text-ink-3' },
};

export function StorageBadge({ storage, thaw = false }: { storage: Storage; thaw?: boolean }) {
  const { label, Icon, className } = STORAGE_META[storage];
  return (
    <span className="chip" title={thaw ? 'Am Vorabend aus dem Tiefkühlfach in den Kühlschrank' : label}>
      <Icon className={`h-3 w-3 ${className}`} />
      {thaw ? 'TK → Vorabend' : label}
    </span>
  );
}

/** The week's Gönn-Essen. */
export function TreatChip({ className = '' }: { className?: string }) {
  return (
    <span className={`chip border-marker/60 bg-marker/25 text-ink ${className}`} title="Gönn-Essen der Woche – darf mehr kosten und etwas mehr kcal haben">
      <PartyPopper className="h-3 w-3" /> Gönn-Essen
    </span>
  );
}

/** Tone for a day total against its target range. */
export function rangeTone(value: number, min: number, max: number) {
  if (value >= min && value <= max) return 'text-leaf';
  return 'text-warn';
}

export const nutritionLink = (link: string) => {
  const [, section] = link.split(':');
  return section ?? null;
};
