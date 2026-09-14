'use client';

import React from 'react';
import { Subject, Task } from '@/types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
  tasks: Task[];
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  tasks,
}) => {
  const today = new Date();
  const currentMonthName = today.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  // Generate days of the current week
  const daysOfWeek = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const startOfWeek = new Date(today);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  startOfWeek.setDate(diff);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();
    
    // Check if tasks exist on this date
    const hasTasks = tasks.some((t) => {
      const taskDate = new Date(t.dueDate);
      return taskDate.toDateString() === d.toDateString() && t.status !== 'done';
    });

    return {
      date: d,
      dayNum: d.getDate(),
      dayName: daysOfWeek[i],
      isToday,
      hasTasks,
    };
  });

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
            <p className="text-[11px] text-muted">Aktuelle Woche</p>
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
      <div className="grid grid-cols-7 gap-1.5 text-center mb-5">
        {weekDays.map((w, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
              w.isToday
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                : 'text-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-[10px] uppercase font-medium">{w.dayName}</span>
            <span className="text-xs font-mono mt-0.5">{w.dayNum}</span>
            {w.hasTasks && (
              <span
                className={`h-1 w-1 rounded-full mt-1 ${
                  w.isToday ? 'bg-amber-300' : 'bg-amber-400'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Subject Filter Pills (Things 3 / Linear style) */}
      <div>
        <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2.5">
          Fächer & Tags
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
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
