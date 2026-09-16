'use client';

import React, { useState } from 'react';
import type { Reminder, Subject, Task } from '@/types';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, addWeeks, format, getISOWeek, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';

interface MiniCalendarProps {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
  tasks: Task[];
  reminders?: Reminder[];
  onEditTask?: (task: Task) => void;
}

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  tasks,
  reminders = [],
  onEditTask,
}) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  const today = new Date();
  const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const scopedTasks = selectedSubjectId ? tasks.filter((t) => t.subjectId === selectedSubjectId) : tasks;
  const tasksOn = (day: Date) => scopedTasks.filter((t) => isSameDay(new Date(t.dueDate), day));
  const remindersOn = (day: Date) => reminders.filter((r) => r.dueDate && isSameDay(new Date(r.dueDate), day));

  const moveWeek = (delta: number) => {
    setWeekOffset((o) => o + delta);
    setSelectedDate((d) => addWeeks(d, delta));
  };

  const selectedTasks = tasksOn(selectedDate);
  const selectedReminders = remindersOn(selectedDate);

  return (
    <section className="card card-pad" aria-label="Kalender">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow">Kalender · KW {getISOWeek(weekStart)}</p>
          <h2 className="card-title mt-1 capitalize">{format(weekStart, 'LLLL yyyy', { locale: de })}</h2>
        </div>
        <div className="-mr-2 flex items-center">
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => {
                setWeekOffset(0);
                setSelectedDate(startOfDay(new Date()));
              }}
              className="btn-ghost h-9 px-2.5 text-[13px]"
            >
              Heute
            </button>
          )}
          <button type="button" onClick={() => moveWeek(-1)} className="icon-btn" aria-label="Vorherige Woche">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => moveWeek(1)} className="icon-btn" aria-label="Nächste Woche">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {days.map((day, idx) => {
          const openTasks = tasksOn(day).filter((t) => t.status !== 'done').length;
          const openReminders = remindersOn(day).filter((r) => !r.isDone).length;
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedDate(day)}
              aria-pressed={isSelected}
              aria-label={format(day, 'EEEE, d. MMMM', { locale: de })}
              className={`flex min-h-[64px] flex-col items-center justify-center rounded-[10px] transition-colors ${
                isSelected ? 'bg-ink text-sheet' : 'text-ink hover:bg-inset'
              }`}
            >
              <span className={`font-display text-[12px] font-semibold uppercase tracking-wider ${isSelected ? 'text-sheet/70' : 'text-ink-3'}`}>
                {DAY_NAMES[idx]}
              </span>
              <span className={`font-display text-[22px] font-bold leading-tight tabular ${isToday && !isSelected ? 'marker' : ''}`}>
                {day.getDate()}
              </span>
              <span className="flex h-1.5 items-center gap-1">
                {openTasks > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-sheet' : 'bg-accent'}`} />}
                {openReminders > 0 && <span className="h-1.5 w-1.5 rounded-full bg-warn" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-line/10 pt-3">
        <p className="eyebrow">{format(selectedDate, 'EEEE, d. MMMM', { locale: de })}</p>
        {selectedTasks.length === 0 && selectedReminders.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-3">Nichts geplant.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {selectedTasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onEditTask?.(t)}
                  className={`flex w-full items-center gap-2 rounded-md py-1 text-left text-[14px] ${
                    t.status === 'done' ? 'text-ink-3 line-through' : 'text-ink'
                  }`}
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-[2px]" style={{ backgroundColor: t.subject?.colorHex ?? 'rgb(var(--ink-3))' }} />
                  <span className="min-w-0 flex-1 truncate font-bold">{t.title}</span>
                  <span className="font-mono text-[12px] text-ink-3 tabular">{format(new Date(t.dueDate), 'HH:mm')}</span>
                </button>
              </li>
            ))}
            {selectedReminders.map((r) => (
              <li key={r.id} className={`flex items-center gap-2 py-1 text-[14px] ${r.isDone ? 'text-ink-3 line-through' : 'text-ink'}`}>
                <Bell className="h-3.5 w-3.5 flex-shrink-0 text-warn" />
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                {r.dueTime && <span className="font-mono text-[12px] text-ink-3 tabular">{r.dueTime}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {subjects.length > 0 && (
        <div className="mt-4 border-t border-line/10 pt-3">
          <p className="eyebrow">Aufgaben nach Fach filtern</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <button type="button" aria-pressed={selectedSubjectId === null} onClick={() => onSelectSubject(null)} className="tab h-8 px-3 text-[13px]">
              Alle
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={selectedSubjectId === s.id}
                onClick={() => onSelectSubject(selectedSubjectId === s.id ? null : s.id)}
                className="tab h-8 px-3 text-[13px]"
              >
                <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: s.colorHex }} />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
