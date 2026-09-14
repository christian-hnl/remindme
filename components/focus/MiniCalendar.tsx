'use client';

import React, { useState } from 'react';
import { Subject, Task, Reminder } from '@/types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Clock, Bell } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface MiniCalendarProps {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
  tasks: Task[];
  reminders?: Reminder[];
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  tasks,
  reminders = [],
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const today = new Date();
  const currentMonthName = today.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  // Generate days of the current week
  const daysOfWeek = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const startOfWeek = new Date(today);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const isToday = isSameDay(d, today);
    const isSelected = isSameDay(d, selectedDate);
    
    // Check if tasks exist on this date
    const dayTasks = tasks.filter((t) => isSameDay(new Date(t.dueDate), d) && t.status !== 'done');
    const dayReminders = reminders.filter((r) => isSameDay(new Date(r.dueDate), d) && !r.isDone);

    return {
      date: d,
      dayNum: d.getDate(),
      dayName: daysOfWeek[i],
      isToday,
      isSelected,
      hasTasks: dayTasks.length > 0,
      tasksCount: dayTasks.length,
      hasReminders: dayReminders.length > 0,
    };
  });

  // Items for selected date
  const selectedDateTasks = tasks.filter((t) => isSameDay(new Date(t.dueDate), selectedDate));
  const selectedDateReminders = reminders.filter((r) => isSameDay(new Date(r.dueDate), selectedDate));

  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 shadow-bento glow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight capitalize">
              {currentMonthName}
            </h2>
            <p className="text-[11px] text-muted">Kalender & Termine</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-muted">
          <button className="p-1 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="p-1 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center mb-4">
        {weekDays.map((w, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDate(w.date)}
            className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
              w.isSelected
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                : w.isToday
                ? 'bg-white/10 text-white font-medium'
                : 'text-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-[10px] uppercase font-medium">{w.dayName}</span>
            <span className="text-xs font-mono mt-0.5">{w.dayNum}</span>
            
            {/* Dots */}
            <div className="flex items-center gap-0.5 mt-1 h-1.5">
              {w.hasTasks && <span className="h-1 w-1 rounded-full bg-amber-400" />}
              {w.hasReminders && <span className="h-1 w-1 rounded-full bg-emerald-400" />}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Date Focus Card */}
      {(selectedDateTasks.length > 0 || selectedDateReminders.length > 0) && (
        <div className="mb-4 p-3 rounded-2xl bg-[#161B26] border border-white/5 text-xs space-y-1.5">
          <div className="font-semibold text-indigo-300 text-[11px] mb-1 flex items-center justify-between">
            <span>Fokus {format(selectedDate, 'dd. MMMM', { locale: de })}:</span>
            <span className="font-mono text-[10px] text-muted">{selectedDateTasks.length} Deadlines</span>
          </div>

          {selectedDateTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-white truncate">
              <span className="truncate">• {t.title}</span>
              <span className="text-[10px] font-mono text-indigo-400 ml-1 flex-shrink-0">
                {t.estimatedMinutes}m
              </span>
            </div>
          ))}

          {selectedDateReminders.map((r) => (
            <div key={r.id} className="flex items-center gap-1 text-amber-300 truncate text-[11px]">
              <Bell className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{r.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Subject Filter Pills */}
      <div>
        <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2.5">
          Fächer & WebUntis-Kürzel
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onSelectSubject(null)}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
              selectedSubjectId === null
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-[#161B26] text-muted border border-white/5 hover:text-white'
            }`}
          >
            Alle
          </button>
          {subjects.map((s) => {
            const isSelected = selectedSubjectId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelectSubject(isSelected ? null : s.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'text-white border shadow-sm'
                    : 'bg-[#161B26] text-muted hover:text-white border border-white/5'
                }`}
                style={
                  isSelected
                    ? { backgroundColor: `${s.colorHex}25`, borderColor: s.colorHex, color: s.colorHex }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.colorHex }}
                />
                <span>{s.name}</span>
                {s.untisCode && (
                  <span className="text-[9px] opacity-60 font-mono">[{s.untisCode}]</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
