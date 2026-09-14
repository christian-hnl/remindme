'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleBlock, Task, Subject } from '@/types';
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
  Maximize2, 
  Minimize2,
  Filter, 
  Plus, 
  BookOpen,
  Sparkles,
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';

interface TimetableScheduleProps {
  schedule: ScheduleBlock[];
  subjects?: Subject[];
  onToggleTaskStatus: (task: Task) => void;
  onOpenUntisModal: () => void;
  onOpenCreateTask?: (subjectId?: string) => void;
}

// Standard periods definition
const STANDARD_PERIODS = [
  { id: 1, label: '1. Stunde', timeRange: '08:00 – 09:30', startMin: 8 * 60, endMin: 9 * 60 + 30 },
  { id: 2, label: '2. Stunde', timeRange: '09:45 – 11:15', startMin: 9 * 60 + 45, endMin: 11 * 60 + 15 },
  { id: 3, label: '3. Stunde', timeRange: '11:45 – 13:15', startMin: 11 * 60 + 45, endMin: 13 * 60 + 15 },
  { id: 4, label: '4. Stunde', timeRange: '13:30 – 15:00', startMin: 13 * 60 + 30, endMin: 15 * 60 },
  { id: 5, label: '5. Stunde', timeRange: '15:15 – 16:45', startMin: 15 * 60 + 15, endMin: 16 * 60 + 45 },
  { id: 6, label: '6. Stunde', timeRange: '17:00 – 18:30', startMin: 17 * 60, endMin: 18 * 60 + 30 },
];

const DAYS = [
  { num: 1, name: 'Montag', short: 'Mo', fullDateLabel: 'Mo' },
  { num: 2, name: 'Dienstag', short: 'Di', fullDateLabel: 'Di' },
  { num: 3, name: 'Mittwoch', short: 'Mi', fullDateLabel: 'Mi' },
  { num: 4, name: 'Donnerstag', short: 'Do', fullDateLabel: 'Do' },
  { num: 5, name: 'Freitag', short: 'Fr', fullDateLabel: 'Fr' },
];

export const TimetableSchedule: React.FC<TimetableScheduleProps> = ({
  schedule,
  subjects = [],
  onToggleTaskStatus,
  onOpenUntisModal,
  onOpenCreateTask,
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [inspectBlock, setInspectBlock] = useState<ScheduleBlock | null>(null);

  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentMinutesFromMidnight, setCurrentMinutesFromMidnight] = useState(0);
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState(1);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sun, 1 = Mon ...
      const activeDay = currentDay >= 1 && currentDay <= 5 ? currentDay : 1;
      setCurrentDayOfWeek(activeDay);
      if (!selectedDay) setSelectedDay(activeDay);

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
  }, [selectedDay]);

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Find period match for a lesson block
  const getPeriodForBlock = (block: ScheduleBlock) => {
    const startMin = timeToMinutes(block.startTime);
    for (let i = 0; i < STANDARD_PERIODS.length; i++) {
      const p = STANDARD_PERIODS[i];
      // If block starts within 30 min of period start
      if (Math.abs(startMin - p.startMin) <= 45 || (startMin >= p.startMin - 15 && startMin < p.endMin)) {
        return p.id;
      }
    }
    // Fallback based on hour
    if (startMin < 9 * 60 + 40) return 1;
    if (startMin < 11 * 60 + 30) return 2;
    if (startMin < 13 * 60 + 20) return 3;
    if (startMin < 15 * 60 + 10) return 4;
    if (startMin < 17 * 60) return 5;
    return 6;
  };

  // Extract unique subject codes or names for filter bar
  const uniqueSubjects = useMemo(() => {
    const set = new Map<string, { code: string; name: string; colorHex: string }>();
    schedule.forEach((b) => {
      const code = b.subjectCode || b.title.slice(0, 3).toUpperCase();
      if (!set.has(code)) {
        set.set(code, {
          code,
          name: b.title.split('(')[0].trim(),
          colorHex: b.colorHex || '#6366F1',
        });
      }
    });
    return Array.from(set.values());
  }, [schedule]);

  // Lessons filtered by subject if active
  const filteredSchedule = useMemo(() => {
    if (!selectedSubjectFilter) return schedule;
    return schedule.filter((b) => {
      const code = b.subjectCode || b.title.slice(0, 3).toUpperCase();
      return code.toLowerCase() === selectedSubjectFilter.toLowerCase();
    });
  }, [schedule, selectedSubjectFilter]);

  // Active lesson right now (if today)
  const todaySchedule = schedule.filter((b) => b.dayOfWeek === currentDayOfWeek);
  const activeBlock = todaySchedule.find((b) => {
    const start = timeToMinutes(b.startTime);
    const end = timeToMinutes(b.endTime);
    return currentMinutesFromMidnight >= start && currentMinutesFromMidnight <= end;
  });

  // Next upcoming lesson today
  const nextBlock = todaySchedule
    .filter((b) => timeToMinutes(b.startTime) > currentMinutesFromMidnight)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0];

  // Day schedule for day view
  const selectedDaySchedule = filteredSchedule
    .filter((b) => b.dayOfWeek === selectedDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // Render Lesson Card for Grid
  const renderGridLessonCard = (block: ScheduleBlock) => {
    const isFilteredOut = selectedSubjectFilter && 
      (block.subjectCode || block.title.slice(0, 3)).toUpperCase() !== selectedSubjectFilter.toUpperCase();
    const hasTasks = block.tasks && block.tasks.length > 0;
    const pendingTasks = block.tasks ? block.tasks.filter(t => t.status !== 'done') : [];
    const isToday = block.dayOfWeek === currentDayOfWeek;
    const startMin = timeToMinutes(block.startTime);
    const endMin = timeToMinutes(block.endTime);
    const isCurrent = isToday && currentMinutesFromMidnight >= startMin && currentMinutesFromMidnight <= endMin;

    return (
      <div
        key={block.id}
        onClick={() => setInspectBlock(block)}
        className={`group relative rounded-2xl p-3 text-left border transition-all cursor-pointer flex flex-col justify-between ${
          isFilteredOut ? 'opacity-25 scale-98' : 'opacity-100 hover:scale-[1.02]'
        } ${
          isCurrent
            ? 'bg-[#181E30] border-purple-500/60 ring-2 ring-purple-500/30 shadow-lg shadow-purple-950/40'
            : 'bg-[#131722] hover:bg-[#181D2B] border-white/[0.08] hover:border-purple-500/30'
        }`}
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: block.colorHex || '#6366F1',
        }}
      >
        {/* Top: Subject Code & Time */}
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase font-mono shadow-xs"
              style={{
                backgroundColor: `${block.colorHex || '#6366F1'}22`,
                color: block.colorHex || '#818CF8',
              }}
            >
              {block.subjectCode || block.title.slice(0, 3).toUpperCase()}
            </span>

            <span className="text-[10px] font-mono text-muted group-hover:text-white transition-colors">
              {block.startTime} – {block.endTime}
            </span>
          </div>

          {/* Title */}
          <div className="text-xs font-semibold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
            {block.title}
          </div>
        </div>

        {/* Bottom Metadata: High-Contrast Room Pill & Teacher */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            {/* High Contrast Room Pill */}
            {block.room ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1C2234] text-purple-200 border border-purple-500/30 shadow-xs">
                <MapPin className="h-2.5 w-2.5 text-purple-400" />
                <span>{block.room}</span>
              </span>
            ) : (
              <span className="text-[10px] text-muted">—</span>
            )}

            {/* Teacher Pill */}
            {block.teacher && (
              <span className="text-[10px] text-muted flex items-center gap-0.5 truncate max-w-[90px]">
                <User className="h-2.5 w-2.5 text-muted-200 flex-shrink-0" />
                <span className="truncate">{block.teacher.split(' ').slice(-1)[0]}</span>
              </span>
            )}
          </div>

          {/* Vertretung / Entfall notice */}
          {block.substitutionNote && (
            <div className="flex items-center gap-1 text-[9px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
              <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{block.substitutionNote}</span>
            </div>
          )}

          {/* Attached Homework Counter Pill */}
          {hasTasks && (
            <div className="flex items-center justify-between pt-0.5">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                pendingTasks.length > 0 
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              }`}>
                <BookOpen className="h-2.5 w-2.5" />
                <span>
                  {pendingTasks.length > 0 
                    ? `${pendingTasks.length} HÜ offen` 
                    : 'Alle HÜ erledigt'}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-3xl bg-[#0C1019] border border-white/[0.08] p-5 sm:p-6 shadow-bento glow-card transition-all ${
      isFullscreen ? 'fixed inset-4 z-50 overflow-y-auto bg-[#0A0D15]/95 backdrop-blur-2xl border-purple-500/40' : ''
    }`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
            <School className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Stundenplan & WebUntis
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Untis Live
              </span>
            </div>
            <p className="text-xs text-muted">
              Wochen-Matrix, Raum-Navigation & Fächer-Hausaufgaben
            </p>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week / Day View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#141824] p-1 rounded-2xl border border-white/5 text-xs">
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30 font-semibold'
                  : 'text-muted hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Wochen-Gitter</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all ${
                viewMode === 'day'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30 font-semibold'
                  : 'text-muted hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Tagesfokus</span>
            </button>
          </div>

          {/* Fullscreen Expand Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/5 transition-colors"
            title={isFullscreen ? 'Vollbild verlassen' : 'Stundenplan vergrößern'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 text-purple-300" />
            ) : (
              <Maximize2 className="h-4 w-4 text-purple-300" />
            )}
          </button>

          {/* WebUntis Configuration / Refresh */}
          <button
            onClick={onOpenUntisModal}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-white/5 transition-colors"
            title="WebUntis Einstellungen & Sync"
          >
            <RefreshCw className="h-4 w-4 text-indigo-400 hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Subject Filter Bar */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1.5 scrollbar-none">
        <span className="text-[11px] text-muted flex items-center gap-1 mr-1 flex-shrink-0">
          <Filter className="h-3 w-3" />
          <span>Filter:</span>
        </span>
        <button
          onClick={() => setSelectedSubjectFilter(null)}
          className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            selectedSubjectFilter === null
              ? 'bg-white/15 text-white font-semibold border border-white/20'
              : 'bg-[#141824] text-muted hover:text-white border border-white/5'
          }`}
        >
          Alle Fächer ({schedule.length})
        </button>

        {uniqueSubjects.map((s) => {
          const count = schedule.filter(b => (b.subjectCode || b.title.slice(0, 3)).toUpperCase() === s.code.toUpperCase()).length;
          const isSelected = selectedSubjectFilter?.toUpperCase() === s.code.toUpperCase();
          return (
            <button
              key={s.code}
              onClick={() => setSelectedSubjectFilter(isSelected ? null : s.code)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                isSelected
                  ? 'text-white font-semibold border shadow-xs'
                  : 'bg-[#141824] text-muted hover:text-white border border-white/5'
              }`}
              style={{
                backgroundColor: isSelected ? `${s.colorHex}30` : undefined,
                borderColor: isSelected ? `${s.colorHex}60` : undefined,
                color: isSelected ? s.colorHex : undefined,
              }}
            >
              <span 
                className="h-2 w-2 rounded-full" 
                style={{ backgroundColor: s.colorHex }}
              />
              <span>{s.name}</span>
              <span className="font-mono text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Live Classroom Radar Spotlight */}
      {activeBlock && (
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#181B2B] to-[#121624] border border-purple-500/40 p-4 relative overflow-hidden animate-in fade-in shadow-lg shadow-purple-950/20">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-purple-300 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              JETZT IM UNTERRICHT ({activeBlock.startTime} – {activeBlock.endTime})
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/30">
              Noch {Math.max(0, timeToMinutes(activeBlock.endTime) - currentMinutesFromMidnight)} Min verbleibend
            </span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm sm:text-base font-bold text-white mb-1">
                {activeBlock.title}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                {activeBlock.room && (
                  <span className="flex items-center gap-1 text-purple-300 font-bold bg-[#1B2135] px-2 py-0.5 rounded-md border border-purple-500/30">
                    <MapPin className="h-3 w-3 text-purple-400" />
                    {activeBlock.room}
                  </span>
                )}
                {activeBlock.teacher && (
                  <span className="flex items-center gap-1 text-white/80">
                    <User className="h-3 w-3 text-purple-400" />
                    {activeBlock.teacher}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Button to inspect / view homework */}
            <button
              onClick={() => setInspectBlock(activeBlock)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all shadow-sm"
            >
              Details & Hausaufgaben anzeigen
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 1: ADVANCED TIMETABLE MATRIX (Period Rows x Monday-Friday Columns) */}
      {/* ===================================================================== */}
      {viewMode === 'week' ? (
        <div className="space-y-3">
          {/* Schedule Grid Container */}
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="min-w-[760px]">
              {/* Header: Days Mon-Fri */}
              <div className="grid grid-cols-6 gap-2 mb-2">
                {/* Top-left corner: Time / Period label */}
                <div className="rounded-xl bg-[#121622] p-2.5 text-center text-xs font-semibold text-muted border border-white/5 flex items-center justify-center">
                  <span>Stunde / Zeit</span>
                </div>

                {DAYS.map((d) => {
                  const isToday = d.num === currentDayOfWeek;
                  const dayLessonsCount = filteredSchedule.filter((b) => b.dayOfWeek === d.num).length;
                  return (
                    <div
                      key={d.num}
                      onClick={() => {
                        setSelectedDay(d.num);
                        setViewMode('day');
                      }}
                      className={`rounded-xl p-2.5 text-center border transition-all cursor-pointer ${
                        isToday
                          ? 'bg-purple-950/30 border-purple-500/50 shadow-sm shadow-purple-900/20'
                          : 'bg-[#121622] hover:bg-[#161B28] border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`text-xs font-bold ${isToday ? 'text-purple-300' : 'text-white'}`}>
                          {d.name}
                        </span>
                        {isToday && (
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                        )}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5 font-mono">
                        {dayLessonsCount} {dayLessonsCount === 1 ? 'Einheit' : 'Einheiten'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid Rows: Period by Period */}
              <div className="space-y-2">
                {STANDARD_PERIODS.map((period) => {
                  return (
                    <div key={period.id} className="grid grid-cols-6 gap-2">
                      {/* Period Header Column */}
                      <div className="rounded-2xl bg-[#101420] border border-white/5 p-2 flex flex-col justify-center items-center text-center">
                        <span className="text-xs font-bold text-white/90">
                          {period.label}
                        </span>
                        <span className="text-[10px] font-mono text-muted mt-0.5">
                          {period.timeRange}
                        </span>
                      </div>

                      {/* 5 Day Cells for this Period */}
                      {DAYS.map((day) => {
                        // Find all lessons for this day in this period
                        const lessonsInSlot = filteredSchedule.filter((b) => {
                          if (b.dayOfWeek !== day.num) return false;
                          const pId = getPeriodForBlock(b);
                          return pId === period.id;
                        });

                        const isToday = day.num === currentDayOfWeek;

                        return (
                          <div
                            key={`${day.num}-${period.id}`}
                            className={`min-h-[110px] rounded-2xl p-1.5 transition-all border ${
                              isToday
                                ? 'bg-[#101422]/60 border-purple-500/20'
                                : 'bg-[#0E121C]/40 border-white/[0.04]'
                            }`}
                          >
                            {lessonsInSlot.length === 0 ? (
                              <div className="h-full flex items-center justify-center rounded-xl hover:bg-white/[0.02] transition-colors group">
                                <span className="text-[10px] text-white/20 font-mono group-hover:text-muted">
                                  —
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1.5 h-full">
                                {lessonsInSlot.map((block) => renderGridLessonCard(block))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* VIEW 2: DAY FOCUS VIEW (Interactive Timeline with Checklist)          */
        /* ===================================================================== */
        <div className="space-y-4">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {DAYS.map((d) => {
              const isSelected = selectedDay === d.num;
              const count = schedule.filter((s) => s.dayOfWeek === d.num).length;
              return (
                <button
                  key={d.num}
                  onClick={() => setSelectedDay(d.num)}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/40'
                      : 'bg-[#141824] text-muted hover:text-white border border-white/5'
                  }`}
                >
                  <span>{d.name}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                    {count} Std
                  </span>
                </button>
              );
            })}
          </div>

          {/* Day Timeline List */}
          <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
            {selectedDaySchedule.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                Kein Unterricht an diesem Tag eingetragen.
              </div>
            ) : (
              selectedDaySchedule.map((block) => {
                const startMin = timeToMinutes(block.startTime);
                const endMin = timeToMinutes(block.endTime);
                const isCurrent = block.dayOfWeek === currentDayOfWeek && 
                  currentMinutesFromMidnight >= startMin && currentMinutesFromMidnight <= endMin;
                const isPassed = block.dayOfWeek === currentDayOfWeek && currentMinutesFromMidnight > endMin;
                const hasTasks = block.tasks && block.tasks.length > 0;

                return (
                  <div
                    key={block.id}
                    className={`relative pl-8 transition-all ${
                      isPassed ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    {/* Bullet */}
                    <div
                      className={`absolute left-2.5 top-4 h-3 w-3 rounded-full -translate-x-1/2 border-2 border-[#0C1019] ${
                        isCurrent
                          ? 'bg-purple-400 ring-4 ring-purple-500/30'
                          : isPassed
                          ? 'bg-muted'
                          : 'bg-indigo-400'
                      }`}
                    />

                    {/* Lesson Detail Card */}
                    <div
                      className={`rounded-2xl p-4 border transition-all ${
                        isCurrent
                          ? 'bg-[#181E30] border-purple-500/50 shadow-lg shadow-purple-900/30'
                          : 'bg-[#131724] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-white/5 font-mono text-xs text-muted-200">
                            {block.startTime} – {block.endTime}
                          </span>

                          {block.subjectCode && (
                            <span
                              className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: `${block.colorHex}25`,
                                color: block.colorHex,
                              }}
                            >
                              {block.subjectCode}
                            </span>
                          )}

                          {block.substitutionNote && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="h-3 w-3" />
                              {block.substitutionNote}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* High Contrast Room Pill */}
                          {block.room && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1E243A] text-purple-200 border border-purple-500/40 shadow-sm">
                              <MapPin className="h-3.5 w-3.5 text-purple-400" />
                              <span>{block.room}</span>
                            </span>
                          )}

                          {block.teacher && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted bg-white/5">
                              <User className="h-3 w-3 text-muted-200" />
                              <span>{block.teacher}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Lesson Title */}
                      <div className="text-sm sm:text-base font-bold text-white mb-2">
                        {block.title}
                      </div>

                      {/* ========================================================= */}
                      {/* EMBEDDED HOMEWORK CHECKLIST (Instant 0ms status toggles)   */}
                      {/* ========================================================= */}
                      {hasTasks && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                          <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>Verknüpfte Hausaufgaben für diese Stunde:</span>
                            </span>
                            <span className="font-mono text-[10px] text-muted">
                              {block.tasks!.filter(t => t.status === 'done').length}/{block.tasks!.length} erledigt
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {block.tasks!.map((hw) => {
                              const isDone = hw.status === 'done';
                              return (
                                <div
                                  key={hw.id}
                                  className={`flex items-start justify-between gap-3 p-2.5 rounded-xl text-xs transition-all ${
                                    isDone
                                      ? 'bg-black/30 text-muted opacity-60 line-through'
                                      : 'bg-indigo-950/40 border border-indigo-500/25 text-white shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
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
                                        <div className="text-[10px] text-muted line-clamp-1 mt-0.5">
                                          {hw.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-indigo-300">
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
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: LESSON DETAIL INSPECTOR (Opened by clicking any lesson card)   */}
      {/* ===================================================================== */}
      {inspectBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0F131E] border border-white/10 p-6 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setInspectBlock(null)}
              className="absolute right-4 top-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header with subject color badge */}
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase"
                style={{
                  backgroundColor: `${inspectBlock.colorHex}25`,
                  color: inspectBlock.colorHex,
                }}
              >
                {inspectBlock.subjectCode || 'FACH'}
              </span>
              <span className="text-xs font-mono text-muted">
                {DAYS.find(d => d.num === inspectBlock.dayOfWeek)?.name} • {inspectBlock.startTime} – {inspectBlock.endTime}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-4">
              {inspectBlock.title}
            </h3>

            {/* Metadata Pills */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="p-3 rounded-2xl bg-[#141926] border border-white/5">
                <span className="text-[10px] text-muted block mb-1">Raum & Ort</span>
                <div className="flex items-center gap-1.5 text-sm font-bold text-purple-200">
                  <MapPin className="h-4 w-4 text-purple-400" />
                  <span>{inspectBlock.room || 'Kein Raum hinterlegt'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#141926] border border-white/5">
                <span className="text-[10px] text-muted block mb-1">Lehrkraft</span>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  <User className="h-4 w-4 text-purple-400" />
                  <span>{inspectBlock.teacher || 'Keine Lehrkraft angegeben'}</span>
                </div>
              </div>
            </div>

            {inspectBlock.substitutionNote && (
              <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-0.5">Vertretung / Raumänderung</div>
                  <div>{inspectBlock.substitutionNote}</div>
                </div>
              </div>
            )}

            {/* Homework Tasks Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  <span>Hausaufgaben für diese Stunde ({inspectBlock.tasks?.length || 0})</span>
                </span>
                {onOpenCreateTask && (
                  <button
                    onClick={() => {
                      const subjId = inspectBlock.subjectId;
                      setInspectBlock(null);
                      onOpenCreateTask(subjId || undefined);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>HÜ hinzufügen</span>
                  </button>
                )}
              </div>

              {inspectBlock.tasks && inspectBlock.tasks.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {inspectBlock.tasks.map((task) => {
                    const isDone = task.status === 'done';
                    return (
                      <div
                        key={task.id}
                        className={`flex items-start justify-between gap-3 p-3 rounded-2xl text-xs transition-all ${
                          isDone
                            ? 'bg-black/30 text-muted opacity-60 line-through'
                            : 'bg-[#151A29] border border-indigo-500/30 text-white shadow-xs'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            onClick={() => {
                              onToggleTaskStatus(task);
                              if (!isDone) fireMilestoneGlow();
                              // Update local inspectBlock tasks optimistically
                              setInspectBlock(prev => prev ? {
                                ...prev,
                                tasks: prev.tasks?.map(t => t.id === task.id ? { ...t, status: isDone ? 'backlog' : 'done' } : t)
                              } : null);
                            }}
                            className="mt-0.5 text-muted hover:text-indigo-400 flex-shrink-0"
                          >
                            {isDone ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Circle className="h-4 w-4 hover:text-indigo-400" />
                            )}
                          </button>
                          <div>
                            <div className="font-semibold text-sm">{task.title}</div>
                            {task.description && (
                              <div className="text-muted text-[11px] mt-0.5">{task.description}</div>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-indigo-300 flex-shrink-0">
                          ⏱️ {task.estimatedMinutes}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#141926] text-center text-xs text-muted">
                  Keine Hausaufgaben für diese Stunde hinterlegt.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setInspectBlock(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
