'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import type { Priority, Subject, Task, TaskStatus } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/client';
import { toDateTimeInput } from '@/lib/format';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  /** Existing task to edit; null creates a new one. */
  task: Task | null;
  initialSubjectId?: string | null;
  onSaved: (task: Task, isNew: boolean) => void;
  onDelete?: (id: string) => void;
}

const EFFORT_PRESETS = [15, 30, 45, 60, 90];

const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 'low', label: 'Locker' },
  { id: 'medium', label: 'Normal' },
  { id: 'high', label: 'Wichtig' },
  { id: 'urgent', label: 'Dringend' },
];

function defaultDueDate() {
  const d = new Date();
  if (d.getHours() >= 18) d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, subjects, task, initialSubjectId, onSaved, onDelete }) => {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('backlog');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setSubjectId(task?.subjectId ?? initialSubjectId ?? '');
    setEstimatedMinutes(task?.estimatedMinutes ?? 30);
    setPriority(task?.priority ?? 'medium');
    setStatus(task?.status ?? 'backlog');
    setDue(toDateTimeInput(task ? new Date(task.dueDate) : defaultDueDate()));
  }, [isOpen, task, initialSubjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dueDate = new Date(due);
    if (!title.trim()) return;
    if (Number.isNaN(dueDate.getTime())) {
      toast('Bitte ein gültiges Datum wählen', 'error');
      return;
    }

    setSaving(true);
    try {
      const saved = await api<Task>(task ? `/api/v1/tasks/${task.id}` : '/api/v1/tasks', {
        method: task ? 'PATCH' : 'POST',
        body: {
          title: title.trim(),
          description: description.trim() || null,
          subjectId: subjectId || null,
          estimatedMinutes,
          priority,
          dueDate: dueDate.toISOString(),
          ...(task && { status }),
        },
      });
      onSaved(saved, !task);
      onClose();
    } catch (error) {
      toast(`Speichern fehlgeschlagen: ${errorMessage(error)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
      subtitle={task?.isUntisSync ? 'Aus WebUntis übernommen' : undefined}
      icon={<BookOpen className="h-[18px] w-[18px]" />}
      footer={
        <>
          {task && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              className="btn-danger mr-auto"
            >
              <Trash2 className="h-4 w-4" /> Löschen
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">
            Abbrechen
          </button>
          <button type="submit" form="task-form" disabled={saving || !title.trim()} className="btn-primary">
            {saving ? 'Speichert…' : task ? 'Speichern' : 'Anlegen'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="task-title" className="field-label">
            Was ist zu tun?
          </label>
          <input
            id="task-title"
            autoFocus
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Mathe Buch S. 84 Nr. 3"
            className="field-input text-[16px]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="task-subject" className="field-label">
              Fach
            </label>
            <select id="task-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="field-input">
              <option value="">Kein Fach</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="task-due" className="field-label">
              Fällig
            </label>
            <input id="task-due" type="datetime-local" required value={due} onChange={(e) => setDue(e.target.value)} className="field-input font-mono text-[14px]" />
          </div>
        </div>

        <div>
          <span className="field-label">Wie wichtig?</span>
          <div className="segmented grid-cols-4" role="group" aria-label="Priorität">
            {PRIORITIES.map((p) => (
              <button key={p.id} type="button" aria-pressed={priority === p.id} onClick={() => setPriority(p.id)} className="segmented-item">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="field-label">Zeitaufwand</span>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Zeitaufwand">
            {EFFORT_PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                aria-pressed={estimatedMinutes === mins}
                onClick={() => setEstimatedMinutes(mins)}
                className="tab border-line/15 font-mono text-[13px]"
              >
                {mins} min
              </button>
            ))}
            <label className="sr-only" htmlFor="task-minutes">
              Minuten
            </label>
            <input
              id="task-minutes"
              type="number"
              min={5}
              max={1440}
              step={5}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Math.max(5, Number(e.target.value) || 5))}
              className="field-input h-9 w-20 py-0 font-mono text-[13px]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="task-description" className="field-label">
            Notizen <span className="normal-case tracking-normal text-ink-3">(optional)</span>
          </label>
          <textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Seitenzahlen, Kapitel, Hinweise…"
            className="field-input resize-y"
          />
        </div>

        {task && (
          <div>
            <span className="field-label">Status</span>
            <div className="segmented grid-cols-3" role="group" aria-label="Status">
              {(
                [
                  ['backlog', 'Offen'],
                  ['in_progress', 'In Arbeit'],
                  ['done', 'Erledigt'],
                ] as [TaskStatus, string][]
              ).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(id)} className="segmented-item">
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
