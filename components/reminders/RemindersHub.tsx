'use client';

import React, { useEffect, useState } from 'react';
import type { Reminder, RepeatPattern } from '@/types';
import { Bell, ChevronDown, Plus, Repeat, Trash2, User } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CheckButton } from '@/components/ui/CheckButton';
import { fromDateInput, relativeDayLabel, toDateInput } from '@/lib/format';

interface RemindersHubProps {
  reminders: Reminder[];
  onToggleReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  /** Creates (no id) or updates a reminder; rejects on failure. */
  onSaveReminder: (data: Partial<Reminder>, id?: string) => Promise<void>;
  /** Opens the "new reminder" form, e.g. from the global "Neu" menu. */
  createRequest?: boolean;
  onCreateRequestHandled?: () => void;
}

type Filter = 'all' | 'dated' | 'someday' | 'people';

interface FormState {
  title: string;
  personName: string;
  hasDueDate: boolean;
  dueDate: string;
  dueTime: string;
  category: string;
  priority: Reminder['priority'];
  repeatPattern: RepeatPattern;
}

const CATEGORIES = ['Haushalt', 'Erledigung', 'Gesundheit', 'Schule', 'Person', 'Sonstiges'];

const emptyForm = (title = ''): FormState => ({
  title,
  personName: '',
  hasDueDate: true,
  dueDate: toDateInput(new Date()),
  dueTime: '',
  category: 'Sonstiges',
  priority: 'medium',
  repeatPattern: 'none',
});

const isPerson = (r: Reminder) => r.reminderType === 'say_to_person' || !!r.personName;

function dueInfo(r: Reminder) {
  if (!r.hasDueDate || !r.dueDate) return null;
  const date = new Date(r.dueDate);
  const at = new Date(date);
  const [h, m] = (r.dueTime ?? '23:59').split(':').map(Number);
  at.setHours(h, m, 0, 0);
  return {
    at,
    label: `${relativeDayLabel(date)}${r.dueTime ? `, ${r.dueTime}` : ''}`,
    overdue: at.getTime() < Date.now(),
  };
}

const FILTERS: { id: Filter; label: string; match: (r: Reminder) => boolean }[] = [
  { id: 'all', label: 'Alle', match: () => true },
  { id: 'dated', label: 'Mit Termin', match: (r) => r.hasDueDate },
  { id: 'someday', label: 'Irgendwann', match: (r) => !r.hasDueDate },
  { id: 'people', label: 'Jemandem sagen', match: isPerson },
];

export const RemindersHub: React.FC<RemindersHubProps> = ({
  reminders,
  onToggleReminder,
  onDeleteReminder,
  onSaveReminder,
  createRequest,
  onCreateRequestHandled,
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const openCreate = (title = '') => {
    setEditing(null);
    setForm(emptyForm(title));
    setIsFormOpen(true);
  };

  const openEdit = (r: Reminder) => {
    setEditing(r);
    setForm({
      title: r.title,
      personName: r.personName ?? '',
      hasDueDate: r.hasDueDate,
      dueDate: toDateInput(r.dueDate ? new Date(r.dueDate) : new Date()),
      dueTime: r.dueTime ?? '',
      category: r.category,
      priority: r.priority,
      repeatPattern: r.repeatPattern,
    });
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (!createRequest) return;
    openCreate();
    onCreateRequestHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRequest]);

  const submitQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    try {
      await onSaveReminder({ title, hasDueDate: false, reminderType: 'action', category: 'Sonstiges', icon: 'bell' });
      setQuickTitle('');
    } catch {
      // toast shown by container
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const person = form.personName.trim();
    setSubmitting(true);
    try {
      await onSaveReminder(
        {
          title: form.title.trim(),
          personName: person || null,
          reminderType: person ? 'say_to_person' : 'action',
          hasDueDate: form.hasDueDate,
          dueDate: form.hasDueDate ? fromDateInput(form.dueDate).toISOString() : null,
          dueTime: form.hasDueDate && form.dueTime ? form.dueTime : null,
          category: person && form.category === 'Sonstiges' ? 'Person' : form.category,
          priority: form.priority,
          repeatPattern: form.hasDueDate ? form.repeatPattern : 'none',
          icon: person ? 'user' : 'bell',
        },
        editing?.id
      );
      setIsFormOpen(false);
    } catch {
      // Error toast comes from the container; keep the form open.
    } finally {
      setSubmitting(false);
    }
  };

  const activeFilter = FILTERS.find((f) => f.id === filter)!;
  const active = reminders
    .filter((r) => !r.isDone && activeFilter.match(r))
    .sort((a, b) => {
      const da = dueInfo(a);
      const db = dueInfo(b);
      if (da && db) return da.at.getTime() - db.at.getTime();
      if (da || db) return da ? -1 : 1;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });
  const done = reminders.filter((r) => r.isDone && activeFilter.match(r));
  const openCount = reminders.filter((r) => !r.isDone).length;

  return (
    <section className="card" aria-label="Erinnerungen">
      <div className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div>
          <p className="eyebrow">Alltag</p>
          <h2 className="card-title mt-1">Erinnerungen</h2>
          <p className="mt-1 text-[13px] text-ink-3">{openCount === 0 ? 'Nichts offen' : `${openCount} offen`}</p>
        </div>
        <button type="button" onClick={() => openCreate()} className="btn-secondary h-9 flex-shrink-0 px-3">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Mit Termin
        </button>
      </div>

      <form onSubmit={submitQuick} className="mx-4 mt-2 flex items-center gap-2 sm:mx-5">
        <label htmlFor="quick-reminder" className="sr-only">
          Schnell eine Erinnerung hinzufügen
        </label>
        <input
          id="quick-reminder"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Woran soll ich dich erinnern?"
          className="field-input h-10 py-0"
          maxLength={200}
        />
        <button type="submit" disabled={!quickTitle.trim()} className="btn-primary h-10 w-10 flex-shrink-0 px-0" aria-label="Hinzufügen">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </form>

      <div className="scrollbar-none mt-3 flex gap-1 overflow-x-auto px-4 sm:px-5" role="tablist" aria-label="Filter">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className="tab">
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-2 sm:px-5">
        {active.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-ink-3">Hier ist gerade nichts offen.</p>
        ) : (
          <ul className="divide-y divide-line/10">
            {active.map((r) => {
              const due = dueInfo(r);
              return (
                <li key={r.id} className="group flex items-start gap-3 py-3">
                  <CheckButton checked={false} onChange={() => onToggleReminder(r)} label="Erledigt" className="mt-0.5" />
                  <button type="button" onClick={() => openEdit(r)} className="min-w-0 flex-1 rounded-md text-left">
                    <span className="block text-[15px] font-bold leading-snug text-ink">{r.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-ink-2">
                      {r.personName && (
                        <span className="inline-flex items-center gap-1 font-bold">
                          <User className="h-3.5 w-3.5" /> {r.personName}
                        </span>
                      )}
                      {due ? (
                        <span className={due.overdue ? 'pen-mark font-bold text-pen' : ''}>{due.label}</span>
                      ) : (
                        <span className="text-ink-3">irgendwann</span>
                      )}
                      {r.repeatPattern !== 'none' && (
                        <span className="inline-flex items-center gap-1 text-ink-3">
                          <Repeat className="h-3.5 w-3.5" /> {r.repeatPattern === 'daily' ? 'täglich' : 'wöchentlich'}
                        </span>
                      )}
                      {r.priority === 'high' && <span className="font-bold text-warn">wichtig</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteReminder(r.id)}
                    className="icon-btn -mr-1 h-9 w-9 hover:text-pen sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                    aria-label={`„${r.title}“ löschen`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {done.length > 0 && (
          <div className="border-t border-line/10 py-2">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setShowDone((v) => !v)} className="btn-ghost -ml-2 h-8 px-2 text-[13px]" aria-expanded={showDone}>
                <ChevronDown className={`h-4 w-4 transition-transform ${showDone ? '' : '-rotate-90'}`} />
                Erledigt ({done.length})
              </button>
              {showDone && (
                <button type="button" onClick={() => done.forEach((r) => onDeleteReminder(r.id))} className="btn-ghost h-8 px-2 text-[13px] hover:text-pen">
                  Alle löschen
                </button>
              )}
            </div>
            {showDone && (
              <ul className="mt-1">
                {done.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-1.5">
                    <CheckButton checked onChange={() => onToggleReminder(r)} label="Wieder öffnen" />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink-3 line-through">{r.title}</span>
                    <button type="button" onClick={() => onDeleteReminder(r.id)} className="icon-btn h-8 w-8 hover:text-pen" aria-label="Löschen">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="sm"
        title={editing ? 'Erinnerung bearbeiten' : 'Neue Erinnerung'}
        icon={<Bell className="h-[18px] w-[18px]" />}
        footer={
          <>
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-ghost">
              Abbrechen
            </button>
            <button type="submit" form="reminder-form" disabled={submitting || !form.title.trim()} className="btn-primary">
              {submitting ? 'Speichert…' : 'Speichern'}
            </button>
          </>
        }
      >
        <form id="reminder-form" onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="reminder-title" className="field-label">
              Woran erinnern?
            </label>
            <input
              id="reminder-title"
              autoFocus
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="z. B. Wäsche aufhängen"
              className="field-input text-[16px]"
            />
          </div>

          <div>
            <label htmlFor="reminder-person" className="field-label">
              Jemandem sagen? <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="reminder-person"
              value={form.personName}
              onChange={(e) => update('personName', e.target.value)}
              placeholder="z. B. Mama, Lukas, Frau Weber"
              className="field-input"
            />
          </div>

          <div>
            <span className="field-label">Wann?</span>
            <div className="segmented grid-cols-2" role="group" aria-label="Termin">
              <button type="button" aria-pressed={form.hasDueDate} onClick={() => update('hasDueDate', true)} className="segmented-item">
                An einem Tag
              </button>
              <button type="button" aria-pressed={!form.hasDueDate} onClick={() => update('hasDueDate', false)} className="segmented-item">
                Irgendwann
              </button>
            </div>

            {form.hasDueDate && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reminder-date" className="field-label">
                    Datum
                  </label>
                  <input
                    id="reminder-date"
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => update('dueDate', e.target.value)}
                    className="field-input font-mono text-[14px]"
                  />
                </div>
                <div>
                  <label htmlFor="reminder-time" className="field-label">
                    Uhrzeit
                  </label>
                  <input
                    id="reminder-time"
                    type="time"
                    value={form.dueTime}
                    onChange={(e) => update('dueTime', e.target.value)}
                    className="field-input font-mono text-[14px]"
                  />
                </div>
                <div className="col-span-2">
                  <span className="field-label">Wiederholen</span>
                  <div className="segmented grid-cols-3" role="group" aria-label="Wiederholen">
                    {(
                      [
                        ['none', 'Nie'],
                        ['daily', 'Täglich'],
                        ['weekly', 'Wöchentlich'],
                      ] as [RepeatPattern, string][]
                    ).map(([id, label]) => (
                      <button key={id} type="button" aria-pressed={form.repeatPattern === id} onClick={() => update('repeatPattern', id)} className="segmented-item">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reminder-category" className="field-label">
                Kategorie
              </label>
              <select id="reminder-category" value={form.category} onChange={(e) => update('category', e.target.value)} className="field-input">
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="field-label">Wichtig?</span>
              <button
                type="button"
                aria-pressed={form.priority === 'high'}
                onClick={() => update('priority', form.priority === 'high' ? 'medium' : 'high')}
                className="tab h-[46px] w-full justify-center border-line/15"
              >
                {form.priority === 'high' ? 'Ja, wichtig' : 'Normal'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </section>
  );
};
