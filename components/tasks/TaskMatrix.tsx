'use client';

import React, { useState } from 'react';
import { Task, Subject } from '@/types';
import { TaskCard } from './TaskCard';
import { 
  BookOpen, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Inbox,
  Filter
} from 'lucide-react';

interface TaskMatrixProps {
  tasks: Task[];
  selectedSubjectId: string | null;
  onToggleStatus: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  openCreateTaskModal: () => void;
}

export const TaskMatrix: React.FC<TaskMatrixProps> = ({
  tasks,
  selectedSubjectId,
  onToggleStatus,
  onDeleteTask,
  openCreateTaskModal,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'urgent' | 'upcoming' | 'done'>('all');

  // Filter tasks by selected subject if any
  const subjectFilteredTasks = selectedSubjectId
    ? tasks.filter((t) => t.subjectId === selectedSubjectId)
    : tasks;

  // Calculate total workload for today in minutes
  const today = new Date();
  const todaysTasks = subjectFilteredTasks.filter((t) => {
    const d = new Date(t.dueDate);
    return d.toDateString() === today.toDateString() && t.status !== 'done';
  });

  const totalTodayMinutes = todaysTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const isWorkloadOverloaded = totalTodayMinutes > 180; // Over 3 hours!

  // Tab Filtering
  const filteredTasks = subjectFilteredTasks.filter((t) => {
    if (activeTab === 'done') return t.status === 'done';
    if (t.status === 'done') return false; // hide completed in active tabs

    if (activeTab === 'urgent') {
      const isDueToday = new Date(t.dueDate).toDateString() === today.toDateString();
      return t.priority === 'urgent' || t.priority === 'high' || isDueToday;
    }
    if (activeTab === 'upcoming') {
      const isDueToday = new Date(t.dueDate).toDateString() === today.toDateString();
      return !isDueToday;
    }
    return true; // 'all'
  });

  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 sm:p-6 shadow-bento glow-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Hausaufgaben & Uni-Deadlines
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                {subjectFilteredTasks.filter((t) => t.status !== 'done').length} offen
              </span>
            </div>
            <p className="text-xs text-muted">
              Linear Triage & Things 3 Workflow
            </p>
          </div>
        </div>

        {/* Magic Plus Button */}
        <button
          onClick={openCreateTaskModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Aufgabe anlegen</span>
        </button>
      </div>

      {/* ⚠️ 3-Hour Workload Overload Warning (design.md requirement) */}
      {isWorkloadOverloaded && (
        <div className="mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-center gap-3 text-xs text-amber-300 animate-in fade-in">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-amber-200">Hohes Lernpensum heute: </span>
            Du hast für heute bereits <strong className="font-mono">{Math.floor(totalTodayMinutes / 60)}h {totalTodayMinutes % 60}m</strong> Hausaufgaben geplant (Limit: 3 Stunden). Verschiebe unkritische Aufgaben auf morgen!
          </div>
        </div>
      )}

      {/* Triage Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            Alle Offenen
          </button>
          <button
            onClick={() => setActiveTab('urgent')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'urgent'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Dringend & Heute</span>
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'upcoming'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            Demnächst
          </button>
          <button
            onClick={() => setActiveTab('done')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'done'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Erledigt</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-muted hidden sm:block">
          ⏱️ Heute geplant: {totalTodayMinutes}m
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-muted">
          <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
            <Inbox className="h-6 w-6 text-muted-dark" />
          </div>
          <h3 className="text-sm font-medium text-white mb-1">Keine Aufgaben in diesem Filter</h3>
          <p className="text-xs max-w-xs">
            Alle Aufgaben für diesen Bereich erledigt oder noch keine angelegt.
          </p>
          <button
            onClick={openCreateTaskModal}
            className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            + Neue Aufgabe erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};
