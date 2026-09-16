'use client';

import React, { useState } from 'react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, Flame, Plus, Trash2 } from 'lucide-react';
import type { Habit } from '@/types';

interface HabitsCardProps {
  habits: Habit[];
  onAdd: (name: string, emoji: string) => Promise<void>;
  onToggleDay: (habit: Habit, day: string) => void;
  onDelete: (habit: Habit) => void;
}

const EMOJIS = ['✅', '💧', '🏃', '📚', '🦷', '💊', '🧘', '🛏️', '🥗', '📵', '🎸', '🧹'];
const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

function streakOf(habit: Habit, today: Date) {
  const days = new Set(habit.days);
  let cursor = days.has(dayKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export const HabitsCard: React.FC<HabitsCardProps> = ({ habits, onAdd, onToggleDay, onDelete }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today, { weekStartsOn: 1 }), i));
  const doneToday = habits.filter((h) => h.days.includes(dayKey(today))).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await onAdd(name.trim(), emoji);
      setName('');
    } catch {
      // toast from container
    }
  };

  return (
    <section className="card" aria-label="Routinen">
      <div className="p-4 pb-2 sm:p-5 sm:pb-2">
        <p className="eyebrow">Gewohnheiten</p>
        <h2 className="card-title mt-1">Routinen</h2>
        <p className="mt-1 text-[13px] text-ink-3">
          {habits.length === 0 ? 'Kleine Dinge, jeden Tag' : `Heute ${doneToday} von ${habits.length} erledigt`}
        </p>
      </div>

      <div className="overflow-x-auto px-4 pb-2 sm:px-5">
        {habits.length > 0 && (
          <table className="w-full min-w-[340px] border-separate border-spacing-y-1">
            <thead>
              <tr>
                <th className="text-left">
                  <span className="sr-only">Routine</span>
                </th>
                {week.map((d) => (
                  <th key={d.toISOString()} className={`w-9 pb-1 text-center font-display text-[12px] font-semibold uppercase ${isSameDay(d, today) ? 'text-ink' : 'text-ink-3'}`}>
                    {format(d, 'EEEEEE', { locale: de })}
                  </th>
                ))}
                <th className="w-9">
                  <span className="sr-only">Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => {
                const streak = streakOf(habit, today);
                return (
                  <tr key={habit.id} className="group">
                    <td className="max-w-0 pr-2">
                      <span className="block truncate text-[15px] font-bold text-ink">
                        <span className="mr-1.5" aria-hidden>
                          {habit.emoji}
                        </span>
                        {habit.name}
                      </span>
                      {streak > 1 && (
                        <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-warn">
                          <Flame className="h-3 w-3" /> {streak} Tage in Folge
                        </span>
                      )}
                    </td>
                    {week.map((d) => {
                      const key = dayKey(d);
                      const done = habit.days.includes(key);
                      const future = d > today && !isSameDay(d, today);
                      return (
                        <td key={key} className="text-center">
                          <button
                            type="button"
                            disabled={future}
                            onClick={() => onToggleDay(habit, key)}
                            aria-pressed={done}
                            aria-label={`${habit.name} am ${format(d, 'EEEE', { locale: de })}`}
                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-25 ${
                              done ? 'border-accent bg-accent text-on-accent' : isSameDay(d, today) ? 'border-accent/60 text-transparent hover:bg-accent/10' : 'border-line/20 text-transparent hover:border-accent/50'
                            }`}
                          >
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </button>
                        </td>
                      );
                    })}
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Routine „${habit.name}“ löschen?`)) onDelete(habit);
                        }}
                        className="icon-btn h-8 w-8 hover:text-pen sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                        aria-label={`${habit.name} löschen`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-line/10 p-4 sm:px-5">
        <label htmlFor="habit-emoji" className="sr-only">
          Symbol
        </label>
        <select id="habit-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} className="field-input h-10 w-16 px-2 py-0 text-[18px]">
          {EMOJIS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <label htmlFor="habit-name" className="sr-only">
          Neue Routine
        </label>
        <input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. 2 l Wasser, Vokabeln"
          maxLength={60}
          className="field-input h-10 py-0"
        />
        <button type="submit" disabled={!name.trim()} className="btn-secondary h-10 w-10 flex-shrink-0 px-0" aria-label="Routine hinzufügen">
          <Plus className="h-5 w-5" />
        </button>
      </form>
    </section>
  );
};
