'use client';

import React, { useState } from 'react';
import { Subject, Priority } from '@/types';
import { X, Clock, Calendar, AlertCircle, Plus, BookOpen } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  onTaskCreated: (task: any) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onTaskCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDateStr, setDueDateStr] = useState<string>(() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          subjectId: subjectId || null,
          estimatedMinutes,
          priority,
          dueDate: new Date(dueDateStr).toISOString(),
        }),
      });

      if (res.ok) {
        const newTask = await res.json();
        onTaskCreated(newTask);
        setTitle('');
        setDescription('');
        onClose();
      } else {
        alert('Fehler beim Erstellen der Aufgabe');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-lg rounded-3xl bg-[#11141D] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#141824]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Neue Aufgabe anlegen</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Titel der Aufgabe *
            </label>
            <input
              autoFocus
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Matheblatt 05 lösen oder Latein Vokabeln..."
              className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Notizen / Details (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Zusätzliche Hinweise, Seitenzahlen, Kapitel..."
              className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3.5 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Subject & Priority in 2 Cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Fach / Kategorie
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Kein Fach (Allgemein)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Priorität
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="urgent">🔴 Prio 1 (Dringend)</option>
                <option value="high">🟡 Prio 2 (Hoch)</option>
                <option value="medium">🔵 Prio 3 (Normal)</option>
                <option value="low">⚪ Prio 4 (Niedrig)</option>
              </select>
            </div>
          </div>

          {/* Effort Pills Selection */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Geschätzter Zeitaufwand
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {[15, 30, 45, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setEstimatedMinutes(mins)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                    estimatedMinutes === mins
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-[#161B26] text-muted hover:text-white border border-white/5'
                  }`}
                >
                  ⏱️ {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Fälligkeitsdatum & Uhrzeit
            </label>
            <input
              type="datetime-local"
              value={dueDateStr}
              onChange={(e) => setDueDateStr(e.target.value)}
              className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Wird erstellt...' : 'Aufgabe anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
