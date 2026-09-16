'use client';

import React, { useState } from 'react';
import { endOfDay, isSameDay } from 'date-fns';
import type { Subject, Task } from '@/types';
import { TaskCard } from './TaskCard';
import { AlertTriangle, Plus, X } from 'lucide-react';

interface TaskMatrixProps {
  tasks: Task[];
  subjects: Subject[];
  selectedSubjectId: string | null;
  onClearSubjectFilter: () => void;
  onToggleStatus: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onCreateTask: () => void;
}

type Tab = 'open' | 'urgent' | 'upcoming' | 'done';

const WORKLOAD_LIMIT_MINUTES = 180;

const byStatusThenDue = (a: Task, b: Task) =>
  Number(b.status === 'in_progress') - Number(a.status === 'in_progress') ||
  new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();

const TABS: { id: Tab; label: string }[] = [
  { id: 'open', label: 'Offen' },
  { id: 'urgent', label: 'Dringend' },
  { id: 'upcoming', label: 'Später' },
  { id: 'done', label: 'Erledigt' },
];

const EMPTY: Record<Tab, string> = {
  open: 'Alles erledigt. Neue Hausübung? Tipp auf „Neu“.',
  urgent: 'Nichts Dringendes – heute ist nichts fällig.',
  upcoming: 'Für die nächsten Tage ist nichts eingetragen.',
  done: 'Noch nichts abgehakt.',
};

export const TaskMatrix: React.FC<TaskMatrixProps> = ({
  tasks,
  subjects,
  selectedSubjectId,
  onClearSubjectFilter,
  onToggleStatus,
  onDeleteTask,
  onEditTask,
  onCreateTask,
}) => {
  const [tab, setTab] = useState<Tab>('open');
  const [showAllDone, setShowAllDone] = useState(false);

  const now = new Date();
  const todayEnd = endOfDay(now);
  const scoped = selectedSubjectId ? tasks.filter((t) => t.subjectId === selectedSubjectId) : tasks;
  const open = scoped.filter((t) => t.status !== 'done').sort(byStatusThenDue);

  const lists: Record<Tab, Task[]> = {
    open,
    urgent: open.filter((t) => t.priority === 'urgent' || t.priority === 'high' || new Date(t.dueDate) <= todayEnd),
    upcoming: open.filter((t) => new Date(t.dueDate) > todayEnd),
    done: scoped
      .filter((t) => t.status === 'done')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  };
  const visible = tab === 'done' && !showAllDone ? lists.done.slice(0, 8) : lists[tab];

  const todayMinutes = open.filter((t) => isSameDay(new Date(t.dueDate), now)).reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const overdueCount = open.filter((t) => new Date(t.dueDate) < now).length;
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <section className="card" aria-label="Hausübungen">
      <div className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div className="min-w-0">
          <p className="eyebrow">Schule</p>
          <h2 className="card-title mt-1">Hausübungen</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {open.length} offen
            {overdueCount > 0 && <span className="font-bold text-pen"> · {overdueCount} überfällig</span>}
            {todayMinutes > 0 && ` · heute ${todayMinutes} min`}
          </p>
        </div>
        <button type="button" onClick={onCreateTask} className="btn-primary h-9 flex-shrink-0 px-3">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Neu
        </button>
      </div>

      {selectedSubject && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-2 rounded-[10px] bg-inset px-3 py-2 text-[13px] sm:mx-5">
          <span className="flex items-center gap-2 text-ink-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: selectedSubject.colorHex }} />
            Nur <strong className="text-ink">{selectedSubject.name}</strong>
          </span>
          <button type="button" onClick={onClearSubjectFilter} className="btn-ghost h-7 px-2 text-[13px]">
            <X className="h-3.5 w-3.5" /> Alle zeigen
          </button>
        </div>
      )}

      {todayMinutes > WORKLOAD_LIMIT_MINUTES && (
        <p className="mx-4 mt-2 flex items-start gap-2 rounded-[10px] border border-warn/30 bg-warn/10 px-3 py-2 text-[13px] text-ink sm:mx-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warn" />
          <span>
            <strong>
              {Math.floor(todayMinutes / 60)} h {todayMinutes % 60} min
            </strong>{' '}
            für heute geplant – mehr als 3 Stunden. Verschieb, was warten kann.
          </span>
        </p>
      )}

      <div className="scrollbar-none mt-2 flex gap-1 overflow-x-auto px-4 sm:px-5" role="tablist" aria-label="Filter">
        {TABS.map(({ id, label }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="tab">
            {label}
            <span className="font-mono text-[12px] font-medium opacity-60">{lists[id].length}</span>
          </button>
        ))}
      </div>

      <div className="px-4 pb-2 sm:px-5">
        {visible.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-ink-3">{EMPTY[tab]}</p>
        ) : (
          <ul className="divide-y divide-line/10">
            {visible.map((task) => (
              <TaskCard key={task.id} task={task} onToggleStatus={onToggleStatus} onDeleteTask={onDeleteTask} onEdit={onEditTask} />
            ))}
          </ul>
        )}
        {tab === 'done' && lists.done.length > 8 && (
          <button type="button" onClick={() => setShowAllDone((v) => !v)} className="btn-ghost mb-2 w-full">
            {showAllDone ? 'Weniger anzeigen' : `Alle ${lists.done.length} anzeigen`}
          </button>
        )}
      </div>
    </section>
  );
};
