'use client';

import React, { useState, useEffect } from 'react';
import { ScheduleBlock, Task } from '@/types';
import { 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Calendar, 
  School, 
  RefreshCw, 
  ChevronRight, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';

interface TimetableScheduleProps {
  schedule: ScheduleBlock[];
  onToggleTaskStatus: (task: Task) => void;
  onOpenUntisModal: () => void;
}

export const TimetableSchedule: React.FC<TimetableScheduleProps> = ({
  schedule,
  onToggleTaskStatus,
  onOpenUntisModal,
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedDay, setSelectedDay] = useState<number>(1); // 1 = Monday
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentMinutesFromMidnight, setCurrentMinutesFromMidnight] = useState(0);

  const days = [
    { num: 1, name: 'Montag', short: 'Mo' },
    { num: 2, name: 'Dienstag', short: 'Di' },
    { num: 3, name: 'Mittwoch', short: 'Mi' },
    { num: 4, name: 'Donnerstag', short: 'Do' },
    { num: 5, name: 'Freitag', short: 'Fr' },
  ];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday ...
      if (currentDay >= 1 && currentDay <= 5) {
        setSelectedDay(currentDay);
      }
      const hours = now.getHours();
      const mins = now.getMinutes();
      setCurrentTimeStr(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
      );
      setCurrentMinutesFromMidnight(hours * 60 + mins);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Filter lessons by selected day or for week view
  const daySchedule = schedule.filter((block) => block.dayOfWeek === selectedDay);

  // Find currently active block
  const activeBlock = daySchedule.find((block) => {
    const start = timeToMinutes(block.startTime);
    const end = timeToMinutes(block.endTime);
    return currentMinutesFromMidnight >= start && currentMinutesFromMidnight <= end;
  });

  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 sm:p-6 shadow-bento glow-card">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <School className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Stundenplan & WebUntis
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Untis Live
              </span>
            </div>
            <p className="text-xs text-muted">
              Fächer, Räume, Lehrer & verknüpfte Hausaufgaben
            </p>
          </div>
        </div>

        {/* View Mode & Untis Settings */}
        <div className="flex items-center gap-2">
          {/* Day / Week Switcher */}
          <div className="flex items-center gap-1 bg-[#161B26] p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'day'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              Tag
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted hover:text-white'
              }`}
            >
              Woche
            </button>
          </div>

          <button
            onClick={onOpenUntisModal}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/5 transition-colors"
            title="WebUntis Einstellungen"
          >
            <RefreshCw className="h-4 w-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Weekday Selector Pills */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {days.map((d) => {
          const isSelected = selectedDay === d.num;
          const count = schedule.filter((s) => s.dayOfWeek === d.num).length;
          return (
            <button
              key={d.num}
              onClick={() => setSelectedDay(d.num)}
              className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-600/20'
                  : 'bg-[#161B26] text-muted hover:text-white border border-white/5'
              }`}
            >
              <span>{d.name}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-white/80 font-mono">
                {count} Std
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Lesson Spotlight Pill */}
      {activeBlock && viewMode === 'day' && (
        <div className="mb-5 rounded-2xl bg-purple-950/40 border border-purple-500/40 p-4 relative overflow-hidden animate-in fade-in">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-purple-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              JETZT IM UNTERRICHT
            </span>
            <span className="font-mono text-purple-200 text-xs">
              noch {timeToMinutes(activeBlock.endTime) - currentMinutesFromMidnight} Min ({activeBlock.endTime})
            </span>
          </div>
          <div className="text-sm font-bold text-white mb-1">{activeBlock.title}</div>
          <div className="flex items-center gap-3 text-xs text-purple-200/80">
            {activeBlock.room && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-purple-400" />
                {activeBlock.room}
              </span>
            )}
            {activeBlock.teacher && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3 text-purple-400" />
                {activeBlock.teacher}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: DAY SCHEDULE (Detailed with Attached Homework Badges)             */}
      {/* ========================================================================= */}
      {viewMode === 'day' ? (
        <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
          {daySchedule.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              Kein Unterricht an diesem Tag eingetragen.
            </div>
          ) : (
            daySchedule.map((block) => {
              const startMin = timeToMinutes(block.startTime);
              const endMin = timeToMinutes(block.endTime);
              const isCurrent = currentMinutesFromMidnight >= startMin && currentMinutesFromMidnight <= endMin;
              const isPassed = currentMinutesFromMidnight > endMin;
              const hasTasks = block.tasks && block.tasks.length > 0;

              return (
                <div
                  key={block.id}
                  className={`relative pl-8 transition-all ${
                    isPassed ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {/* Timeline Bullet */}
                  <div
                    className={`absolute left-2.5 top-3.5 h-2.5 w-2.5 rounded-full -translate-x-1/2 border-2 border-[#11141D] ${
                      isCurrent
                        ? 'bg-purple-400 ring-4 ring-purple-500/30'
                        : isPassed
                        ? 'bg-muted'
                        : 'bg-indigo-400'
                    }`}
                  />

                  {/* Lesson Card */}
                  <div
                    className={`rounded-2xl p-3.5 border transition-all ${
                      isCurrent
                        ? 'bg-[#1A1F2C] border-purple-500/40 shadow-lg shadow-purple-900/20'
                        : 'bg-[#161B26] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Time pill */}
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 font-mono text-[11px] text-muted-200">
                          {block.startTime} – {block.endTime}
                        </span>

                        {/* Subject Code */}
                        {block.subjectCode && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: `${block.colorHex}20`,
                              color: block.colorHex,
                            }}
                          >
                            {block.subjectCode}
                          </span>
                        )}

                        {/* Substitution Note */}
                        {block.substitutionNote && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {block.substitutionNote}
                          </span>
                        )}
                      </div>

                      {/* Untis Icon */}
                      <span className="text-[10px] text-muted flex items-center gap-0.5 font-mono">
                        Untis
                      </span>
                    </div>

                    {/* Lesson Title */}
                    <div className="text-xs sm:text-sm font-semibold text-white">
                      {block.title}
                    </div>

                    {/* Meta: Room & Teacher */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                      {block.room && (
                        <span className="flex items-center gap-1 text-purple-300">
                          <MapPin className="h-3 w-3" />
                          <strong>{block.room}</strong>
                        </span>
                      )}
                      {block.teacher && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {block.teacher}
                        </span>
                      )}
                    </div>

                    {/* ============================================================= */}
                    {/* ATTACHED HOMEWORK BADGES & CARDS (The core user request!)     */}
                    {/* ============================================================= */}
                    {hasTasks && (
                      <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-2">
                        <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>Verknüpfte Hausaufgaben für diese Stunde:</span>
                        </div>

                        {block.tasks!.map((hw) => {
                          const isDone = hw.status === 'done';
                          return (
                            <div
                              key={hw.id}
                              className={`flex items-start justify-between gap-2.5 p-2 rounded-xl text-xs transition-all ${
                                isDone
                                  ? 'bg-black/20 text-muted opacity-60 line-through'
                                  : 'bg-indigo-950/30 border border-indigo-500/20 text-white'
                              }`}
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                <button
                                  onClick={() => {
                                    onToggleTaskStatus(hw);
                                    if (!isDone) fireMilestoneGlow();
                                  }}
                                  className="mt-0.5 text-muted hover:text-indigo-400 flex-shrink-0"
                                  title={isDone ? 'Wieder öffnen' : 'Als erledigt markieren'}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                  ) : (
                                    <Circle className="h-4 w-4 hover:text-indigo-400" />
                                  )}
                                </button>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">
                                    {hw.title}
                                  </div>
                                  {hw.description && (
                                    <div className="text-[10px] text-muted line-clamp-1">
                                      {hw.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-indigo-300">
                                  ⏱️ {hw.estimatedMinutes}m
                                </span>
                                {hw.isUntisSync && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300">
                                    UNTIS
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: FULL WEEK VIEW (Mon - Fri Columns)                                */
        /* ========================================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {days.map((d) => {
            const lessons = schedule.filter((s) => s.dayOfWeek === d.num);
            return (
              <div key={d.num} className="rounded-2xl bg-[#161B26] p-3 border border-white/5">
                <div className="text-xs font-semibold text-white mb-2 pb-1.5 border-b border-white/5 flex items-center justify-between">
                  <span>{d.name}</span>
                  <span className="font-mono text-[10px] text-muted">{lessons.length}</span>
                </div>

                <div className="space-y-2">
                  {lessons.map((l) => {
                    const hasTasks = l.tasks && l.tasks.length > 0;
                    return (
                      <div
                        key={l.id}
                        className="p-2 rounded-xl bg-[#11141D] border border-white/5 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-muted mb-0.5">
                          <span className="font-mono">{l.startTime}</span>
                          <span className="text-purple-300 font-medium">{l.room}</span>
                        </div>
                        <div className="font-medium text-white line-clamp-1">{l.title}</div>
                        {hasTasks && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                            <BookOpen className="h-2.5 w-2.5" />
                            <span>{l.tasks!.length} Hausaufgabe(n)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
