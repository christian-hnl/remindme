'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { toDateInput } from '@/lib/format';

type Mode = 'focus' | 'break';

const PRESETS = [
  { label: '25 / 5', focus: 25, break: 5 },
  { label: '50 / 10', focus: 50, break: 10 },
];

const STORAGE_KEY = 'lifetracker:pomodoro';
const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function playChime() {
  try {
    const ctx = new AudioContext();
    [0, 0.25].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = i === 0 ? 880 : 1175;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.65);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Audio not available – notification and title still signal the end.
  }
}

export const PomodoroTimer: React.FC = () => {
  const [presetIndex, setPresetIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('focus');
  const preset = PRESETS[presetIndex];
  const durationMs = (mode === 'focus' ? preset.focus : preset.break) * 60_000;

  // Timestamps instead of decrementing counters: stays exact in background tabs.
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [sessionsToday, setSessionsToday] = useState(0);
  const originalTitle = useRef<string | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (stored.date === toDateInput(new Date())) setSessionsToday(stored.count || 0);
    } catch {
      // ignore
    }
  }, []);

  const complete = useCallback(() => {
    setEndAt(null);
    playChime();
    const finishedFocus = mode === 'focus';
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(finishedFocus ? 'Lernblock geschafft ☕' : 'Pause vorbei', {
        body: finishedFocus ? `Gönn dir ${preset.break} Minuten Pause.` : `Nächster Block: ${preset.focus} Minuten.`,
      });
    }
    if (finishedFocus) {
      setSessionsToday((count) => {
        const next = count + 1;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: toDateInput(new Date()), count: next }));
        } catch {
          // ignore
        }
        return next;
      });
    }
    const nextMode: Mode = finishedFocus ? 'break' : 'focus';
    setMode(nextMode);
    setRemainingMs((nextMode === 'focus' ? preset.focus : preset.break) * 60_000);
  }, [mode, preset]);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const left = endAt - Date.now();
      if (left <= 0) complete();
      else setRemainingMs(left);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endAt, complete]);

  const seconds = Math.ceil(remainingMs / 1000);
  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const isRunning = endAt !== null;

  useEffect(() => {
    if (originalTitle.current === null) originalTitle.current = document.title;
    document.title = isRunning ? `${formatted} · ${mode === 'focus' ? 'Lernen' : 'Pause'}` : originalTitle.current;
  }, [isRunning, formatted, mode]);

  useEffect(
    () => () => {
      if (originalTitle.current !== null) document.title = originalTitle.current;
    },
    []
  );

  const start = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    setEndAt(Date.now() + remainingMs);
  };

  const pause = () => {
    if (endAt !== null) setRemainingMs(Math.max(0, endAt - Date.now()));
    setEndAt(null);
  };

  const switchTo = (nextMode: Mode, nextPreset = presetIndex) => {
    setEndAt(null);
    setMode(nextMode);
    setPresetIndex(nextPreset);
    const p = PRESETS[nextPreset];
    setRemainingMs((nextMode === 'focus' ? p.focus : p.break) * 60_000);
  };

  const progress = Math.min(1, Math.max(0, 1 - remainingMs / durationMs));

  return (
    <section className="card card-pad" aria-label="Lern-Timer">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Fokus</p>
          <h2 className="card-title mt-1">Lern-Timer</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {sessionsToday === 0 ? 'Heute noch kein Block' : `${sessionsToday} ${sessionsToday === 1 ? 'Block' : 'Blöcke'} geschafft`}
          </p>
        </div>
        <div className="segmented w-[140px] grid-cols-2" role="group" aria-label="Phase">
          <button type="button" aria-pressed={mode === 'focus'} onClick={() => switchTo('focus')} className="segmented-item min-h-[34px]">
            Lernen
          </button>
          <button type="button" aria-pressed={mode === 'break'} onClick={() => switchTo('break')} className="segmented-item min-h-[34px]">
            Pause
          </button>
        </div>
      </div>

      <div className="relative mx-auto my-4 flex h-[190px] w-[190px] items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 190 190" aria-hidden>
          <circle cx="95" cy="95" r={RADIUS} fill="none" strokeWidth="10" style={{ stroke: 'rgb(var(--line) / 0.1)' }} />
          <circle
            cx="95"
            cy="95"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-300 ease-linear"
            style={{ stroke: mode === 'focus' ? 'rgb(var(--accent))' : 'rgb(var(--leaf))' }}
          />
        </svg>
        <div className="text-center" role="timer">
          <div className="font-display text-[56px] font-bold leading-none text-ink tabular">{formatted}</div>
          <div className="eyebrow mt-1">{mode === 'focus' ? 'Lernblock' : 'Pause'}</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button type="button" onClick={() => switchTo(mode)} className="icon-btn border border-line/15" aria-label="Zurücksetzen" title="Zurücksetzen">
          <RotateCcw className="h-[18px] w-[18px]" />
        </button>
        <button type="button" onClick={isRunning ? pause : start} className="btn-primary h-12 min-w-[150px] text-[16px]">
          {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          {isRunning ? 'Pausieren' : remainingMs < durationMs ? 'Weiter' : 'Starten'}
        </button>
        <button type="button" onClick={complete} className="icon-btn border border-line/15" aria-label="Phase überspringen" title="Phase überspringen">
          <SkipForward className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="mt-4 flex justify-center gap-1" role="group" aria-label="Dauer">
        {PRESETS.map((p, i) => (
          <button key={p.label} type="button" aria-pressed={presetIndex === i} onClick={() => switchTo('focus', i)} className="tab h-8 px-3 font-mono text-[12px]">
            {p.label} min
          </button>
        ))}
      </div>
    </section>
  );
};
