'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flame, Coffee, Sparkles } from 'lucide-react';

export const PomodoroTimer: React.FC = () => {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(2);

  useEffect(() => {
    let timer: any;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (mode === 'focus') {
        setSessionsCompleted((prev) => prev + 1);
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('focus');
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const setTimerMode = (newMode: 'focus' | 'break') => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const totalTime = mode === 'focus' ? 25 * 60 : 5 * 60;
  const progressPercent = ((totalTime - timeLeft) / totalTime) * 100;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 shadow-bento glow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Deep Focus Timer</h3>
            <p className="text-[11px] text-muted">Pomodoro Session • {sessionsCompleted} abgeschlossen</p>
          </div>
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-1 bg-[#1A1F2C] p-1 rounded-xl border border-white/5 text-[11px]">
          <button
            onClick={() => setTimerMode('focus')}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              mode === 'focus' ? 'bg-indigo-600 text-white font-medium' : 'text-muted hover:text-white'
            }`}
          >
            Fokus
          </button>
          <button
            onClick={() => setTimerMode('break')}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              mode === 'break' ? 'bg-emerald-600 text-white font-medium' : 'text-muted hover:text-white'
            }`}
          >
            Pause
          </button>
        </div>
      </div>

      {/* Timer Circle & Digits */}
      <div className="flex items-center justify-between px-2 py-3">
        <div className="relative flex items-center justify-center">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke={mode === 'focus' ? '#6366F1' : '#10B981'}
              strokeWidth="6"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (251.2 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-mono text-xl font-bold text-white tracking-tight">
              {formattedTime}
            </span>
            <span className="text-[9px] uppercase font-semibold text-muted tracking-wider">
              {mode === 'focus' ? 'Deep Work' : 'Break'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
          <button
            onClick={toggleTimer}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Starten
              </>
            )}
          </button>

          <button
            onClick={resetTimer}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-muted hover:text-white bg-[#1A1F2C] hover:bg-white/10 border border-white/5 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Zurücksetzen
          </button>
        </div>
      </div>
    </div>
  );
};
