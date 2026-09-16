'use client';

import React from 'react';
import type { Task } from '@/types';
import { Flag, Trash2 } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { de } from 'date-fns/locale';
import { CheckButton } from '@/components/ui/CheckButton';

interface TaskCardProps {
  task: Task;
  onToggleStatus: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onEdit: (task: Task) => void;
}

function dueLabel(date: Date) {
  const time = format(date, 'HH:mm');
  if (isToday(date)) return `heute ${time}`;
  if (isTomorrow(date)) return `morgen ${time}`;
  return format(date, 'EEE d. MMM, HH:mm', { locale: de });
}

/** One line in the homework list, styled like an entry in an exercise book. */
export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleStatus, onDeleteTask, onEdit }) => {
  const isDone = task.status === 'done';
  const dueDate = new Date(task.dueDate);
  const isOverdue = !isDone && dueDate.getTime() < Date.now();
  const flagged = !isDone && (task.priority === 'urgent' || task.priority === 'high');

  return (
    <li className="group relative flex items-start gap-3 py-3 pl-3">
      <span
        aria-hidden
        className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full"
        style={{ backgroundColor: task.subject?.colorHex ?? 'rgb(var(--line) / 0.15)' }}
      />
      <CheckButton
        checked={isDone}
        onChange={() => onToggleStatus(task)}
        label={isDone ? 'Wieder öffnen' : 'Als erledigt markieren'}
        className="mt-0.5"
      />

      <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 rounded-md text-left">
        <span className={`block text-[15px] font-bold leading-snug ${isDone ? 'text-ink-3 line-through' : 'text-ink'}`}>{task.title}</span>
        {task.description && !isDone && <span className="mt-0.5 line-clamp-1 block text-[13px] text-ink-2">{task.description}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-ink-2">
          {task.subject && <span className="font-bold text-ink-2">{task.subject.name}</span>}
          <span className={isOverdue ? 'pen-mark font-bold text-pen' : ''}>
            {isOverdue ? `überfällig · ${dueLabel(dueDate)}` : dueLabel(dueDate)}
          </span>
          <span className="font-mono text-[12px] text-ink-3 tabular">{task.estimatedMinutes} min</span>
          {flagged && (
            <span className={`inline-flex items-center gap-0.5 font-bold ${task.priority === 'urgent' ? 'text-pen' : 'text-warn'}`}>
              <Flag className="h-3 w-3" fill="currentColor" />
              {task.priority === 'urgent' ? 'dringend' : 'wichtig'}
            </span>
          )}
          {task.status === 'in_progress' && <span className="chip">in Arbeit</span>}
          {task.isUntisSync && <span className="chip font-mono text-[10px]">UNTIS</span>}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onDeleteTask(task.id)}
        className="icon-btn -mr-1 h-9 w-9 hover:text-pen sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
        aria-label={`„${task.title}“ löschen`}
        title="Löschen"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
};
