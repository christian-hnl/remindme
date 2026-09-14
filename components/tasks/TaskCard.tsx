'use client';

import React from 'react';
import { Task } from '@/types';
import { CheckCircle2, Circle, Clock, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { de } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onToggleStatus: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleStatus,
  onDeleteTask,
}) => {
  const isDone = task.status === 'done';
  const dueDate = new Date(task.dueDate);

  // Format due date relative label
  let dueLabel = format(dueDate, 'dd. MMM, HH:mm', { locale: de });
  if (isToday(dueDate)) {
    dueLabel = `Heute, ${format(dueDate, 'HH:mm')}`;
  } else if (isTomorrow(dueDate)) {
    dueLabel = `Morgen, ${format(dueDate, 'HH:mm')}`;
  }

  // Priority color config
  const priorityConfig = {
    urgent: {
      label: 'Prio 1 (Dringend)',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400',
    },
    high: {
      label: 'Prio 2 (Hoch)',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-400',
    },
    medium: {
      label: 'Prio 3',
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      dot: 'bg-blue-400',
    },
    low: {
      label: 'Prio 4',
      bg: 'bg-slate-500/15',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      dot: 'bg-slate-400',
    },
  }[task.priority] || {
    label: 'Normal',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
  };

  return (
    <div
      className={`group relative rounded-2xl p-4 transition-all duration-200 border ${
        isDone
          ? 'bg-[#11141D]/50 border-white/[0.03] opacity-50'
          : 'bg-[#161B26] border-white/[0.07] hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Things 3 Completion Checkbox */}
        <button
          onClick={() => onToggleStatus(task)}
          className="mt-0.5 flex-shrink-0 text-muted hover:text-indigo-400 transition-colors"
          title={isDone ? 'Wieder öffnen' : 'Als erledigt markieren'}
        >
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-indigo-400 fill-indigo-400/20" />
          ) : (
            <Circle className="h-5 w-5 text-muted-dark hover:text-indigo-400 group-hover:border-indigo-400" />
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            {/* Subject pill */}
            <div className="flex items-center gap-2">
              {task.subject ? (
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border uppercase"
                  style={{
                    backgroundColor: `${task.subject.colorHex}15`,
                    color: task.subject.colorHex,
                    borderColor: `${task.subject.colorHex}30`,
                  }}
                >
                  {task.subject.name}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-muted border border-white/5">
                  Allgemein
                </span>
              )}

              {/* Priority badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${priorityConfig.dot}`} />
                {priorityConfig.label}
              </span>
            </div>

            {/* Delete button (hover only) */}
            <button
              onClick={() => onDeleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-dark hover:text-rose-400 p-1 rounded-lg transition-all"
              title="Löschen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Title */}
          <h4
            className={`text-sm font-semibold tracking-tight leading-snug ${
              isDone ? 'line-through text-muted' : 'text-white'
            }`}
          >
            {task.title}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Meta Footer: Effort-Pill & Due Date */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Effort Pill (Things 3 / Linear) */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-950/40 text-indigo-300 border border-indigo-500/20">
              <Clock className="h-3 w-3 text-indigo-400" />
              <span>{task.estimatedMinutes}m</span>
            </span>

            {/* Due date */}
            <span
              className={`inline-flex items-center gap-1 text-[11px] ${
                task.priority === 'urgent' && !isDone
                  ? 'text-amber-400 font-medium'
                  : 'text-muted'
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>{dueLabel}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
