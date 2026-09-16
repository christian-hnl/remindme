'use client';

import React, { useState } from 'react';
import { formatEuro } from '@/lib/format';

// ------------------------------------------------------------------ donut

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function Donut({ segments, size = 168, thickness = 22, children }: { segments: DonutSegment[]; size?: number; thickness?: number; children?: React.ReactNode }) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-inset" />
        {total > 0 &&
          segments.map((s) => {
            const len = (Math.max(0, s.value) / total) * c;
            // Small gap between segments, but never on a full ring.
            const gap = segments.length > 1 ? Math.min(2, len / 3) : 0;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

// ------------------------------------------------------------------ monthly bars

export interface MonthBar {
  key: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  isCurrent: boolean;
}

export function MonthlyBars({ months }: { months: MonthBar[] }) {
  const [selected, setSelected] = useState(months.length - 1);
  const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.expenses)));
  const active = months[selected] ?? months[months.length - 1];

  return (
    <div>
      <div className="flex h-44 items-end gap-1 sm:gap-1.5" role="list">
        {months.map((m, i) => (
          <button
            key={m.key}
            type="button"
            role="listitem"
            onClick={() => setSelected(i)}
            onMouseEnter={() => setSelected(i)}
            aria-label={`${m.label}: Einnahmen ${formatEuro(m.income)}, Ausgaben ${formatEuro(m.expenses)}`}
            aria-pressed={selected === i}
            className={`group flex h-full min-w-0 flex-1 flex-col justify-end rounded-[6px] px-0.5 pb-0.5 transition-colors ${selected === i ? 'bg-inset' : ''}`}
          >
            <span className="flex h-full items-end justify-center gap-[2px]">
              <span className="w-1/2 max-w-[14px] rounded-t-[3px] bg-leaf/80" style={{ height: `${(m.income / max) * 100}%` }} />
              <span
                className={`w-1/2 max-w-[14px] rounded-t-[3px] ${m.isCurrent ? 'bg-accent/50' : 'bg-accent'}`}
                style={{ height: `${(m.expenses / max) * 100}%` }}
              />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-1 sm:gap-1.5">
        {months.map((m, i) => (
          <span key={m.key} className={`min-w-0 flex-1 truncate text-center text-[10px] font-bold uppercase sm:text-[11px] ${selected === i ? 'text-ink' : 'text-ink-3'}`}>
            {m.label}
          </span>
        ))}
      </div>
      {active && (
        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-[10px] bg-inset px-3 py-2.5 text-[13px]">
          <div>
            <dt className="flex items-center gap-1.5 text-ink-3">
              <span className="h-2 w-2 rounded-full bg-leaf" /> Ein
            </dt>
            <dd className="font-mono font-medium text-ink tabular">{formatEuro(active.income, 0)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-ink-3">
              <span className="h-2 w-2 rounded-full bg-accent" /> Aus
            </dt>
            <dd className="font-mono font-medium text-ink tabular">{formatEuro(active.expenses, 0)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">{active.isCurrent ? `${active.label} (läuft)` : active.label}</dt>
            <dd className={`font-mono font-medium tabular ${active.net >= 0 ? 'text-leaf' : 'text-pen'}`}>
              {active.net >= 0 ? '+' : '−'}
              {formatEuro(Math.abs(active.net), 0)}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ small bars

export function Sparkbars({ values, highlightLast = true, className = '' }: { values: number[]; highlightLast?: boolean; className?: string }) {
  const max = Math.max(1, ...values);
  return (
    <span className={`flex h-6 items-end gap-[2px] ${className}`} aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={`w-[5px] rounded-t-[2px] ${highlightLast && i === values.length - 1 ? 'bg-accent' : 'bg-line/25'}`}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </span>
  );
}

export function WeekdayBars({ days }: { days: { label: string; avgPerDay: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.avgPerDay));
  const peak = days.reduce((best, d, i) => (d.avgPerDay > days[best].avgPerDay ? i : best), 0);
  return (
    <div className="flex h-32 items-end gap-2">
      {days.map((d, i) => (
        <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="font-mono text-[10px] text-ink-3 tabular">{d.avgPerDay >= 1 ? Math.round(d.avgPerDay) : ''}</span>
          <span
            className={`w-full max-w-[28px] rounded-t-[4px] ${i === peak && d.avgPerDay > 0 ? 'bg-accent' : i >= 5 ? 'bg-accent/40' : 'bg-line/25'}`}
            style={{ height: `${Math.max(3, (d.avgPerDay / max) * 78)}%` }}
          />
          <span className={`text-[11px] font-bold ${i === peak ? 'text-ink' : 'text-ink-3'}`}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ forecast line

/** Lines scale with the container; dots and labels are HTML so they never distort. */
export function ForecastLine({ points }: { points: { label: string; balance: number }[] }) {
  const values = points.map((p) => p.balance);
  let min = Math.min(0, ...values);
  let max = Math.max(...values, 1);
  if (max - min < 1) {
    max += 1;
    min -= 1;
  }
  const pad = 4;
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (100 - 2 * pad);
  const y = (v: number) => 12 + (1 - (v - min) / (max - min)) * 76;
  const coords = points.map((p, i) => `${x(i)},${y(p.balance)}`);
  const last = points.length - 1;

  return (
    <div role="img" aria-label={`Kontostand-Prognose: von ${Math.round(values[0])} auf ${Math.round(values[last])} Euro`}>
      <div className="relative h-36">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {min < 0 && <line x1={pad} x2={100 - pad} y1={y(0)} y2={y(0)} className="stroke-pen/50" strokeDasharray="4 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          <polyline points={coords.slice(0, 2).join(' ')} fill="none" className="stroke-accent" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <polyline points={coords.slice(1).join(' ')} fill="none" className="stroke-accent" strokeWidth={2.5} strokeDasharray="6 6" opacity={0.6} vectorEffect="non-scaling-stroke" />
        </svg>
        {points.map((p, i) => (
          <span
            key={`${p.label}-${i}`}
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-sheet ${p.balance < 0 ? 'bg-pen' : 'bg-accent'}`}
            style={{ left: `${x(i)}%`, top: `${y(p.balance)}%` }}
          />
        ))}
        <span className="absolute -translate-y-full whitespace-nowrap pb-1.5 font-mono text-[11px] text-ink-2 tabular" style={{ left: `${x(0)}%`, top: `${y(values[0])}%` }}>
          {Math.round(values[0]).toLocaleString('de-DE')} €
        </span>
        <span
          className={`absolute -translate-x-full -translate-y-full whitespace-nowrap pb-1.5 font-mono text-[11px] font-bold tabular ${values[last] < 0 ? 'text-pen' : 'text-ink'}`}
          style={{ left: `${x(last)}%`, top: `${y(values[last])}%` }}
        >
          {Math.round(values[last]).toLocaleString('de-DE')} €
        </span>
      </div>
      <div className="relative mt-1 h-4">
        {points.map((p, i) => (
          <span
            key={`${p.label}-${i}`}
            className={`absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase ${i === 0 ? 'text-ink' : 'text-ink-3'}`}
            style={{ left: `${x(i)}%` }}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}


// ------------------------------------------------------------------ progress

export function Progress({ value, tone = 'accent', className = '' }: { value: number; tone?: 'accent' | 'leaf' | 'warn' | 'pen'; className?: string }) {
  const colors = { accent: 'bg-accent', leaf: 'bg-leaf', warn: 'bg-warn', pen: 'bg-pen' };
  return (
    <span className={`block h-2 overflow-hidden rounded-full bg-inset ${className}`} aria-hidden>
      <span className={`block h-full rounded-full transition-[width] duration-500 ${colors[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </span>
  );
}
