'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Award, Plus } from 'lucide-react';
import type { Grade, GradeKind, Subject } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { DEFAULT_GRADE_WEIGHT, GRADE_KINDS, GRADE_KIND_LABELS, GRADE_NAMES, weightedAverage } from '@/lib/school';
import { toDateInput, fromDateInput } from '@/lib/format';

export interface GradePayload {
  subjectId: string;
  value: number;
  kind: GradeKind;
  date: string;
  title: string | null;
}

interface GradesCardProps {
  grades: Grade[];
  subjects: Subject[];
  /** Opens the form, optionally prefilled (e.g. from a past exam). */
  request: Partial<GradePayload> | null;
  onRequestHandled: () => void;
  onSave: (payload: GradePayload) => Promise<void>;
  onDelete: (id: string) => void;
}

const formatGrade = (value: number, digits = 0) => value.toFixed(digits).replace('.', ',');

const gradeColor = (value: number) =>
  value >= 4.5 ? 'text-pen' : value >= 3.5 ? 'text-warn' : value <= 1.5 ? 'text-leaf' : 'text-ink';

export const GradesCard: React.FC<GradesCardProps> = ({ grades, subjects, request, onRequestHandled, onSave, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ subjectId: '', value: 0, kind: 'test' as GradeKind, date: toDateInput(new Date()), title: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!request) return;
    setForm({
      subjectId: request.subjectId ?? '',
      value: request.value ?? 0,
      kind: request.kind ?? 'test',
      date: request.date ? toDateInput(new Date(request.date)) : toDateInput(new Date()),
      title: request.title ?? '',
    });
    setIsOpen(true);
    onRequestHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const openCreate = () => {
    setForm({ subjectId: '', value: 0, kind: 'test', date: toDateInput(new Date()), title: '' });
    setIsOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subjectId || !form.value) return;
    const date = fromDateInput(form.date);
    date.setHours(12);
    setSaving(true);
    try {
      await onSave({ subjectId: form.subjectId, value: form.value, kind: form.kind, date: date.toISOString(), title: form.title.trim() || null });
      setIsOpen(false);
    } catch {
      // toast from container
    } finally {
      setSaving(false);
    }
  };

  const rows = subjects
    .map((subject) => {
      const list = grades.filter((g) => g.subjectId === subject.id);
      return { subject, list, average: weightedAverage(list) };
    })
    .filter((row) => row.list.length > 0)
    .sort((a, b) => a.subject.name.localeCompare(b.subject.name, 'de'));

  const averages = rows.map((r) => r.average!).filter((a) => a !== null);
  const overall = averages.length ? averages.reduce((s, a) => s + a, 0) / averages.length : null;

  return (
    <section className="card" aria-label="Noten">
      <div className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div>
          <p className="eyebrow">Schule</p>
          <h2 className="card-title mt-1">Noten</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {overall === null ? 'Noch keine Noten' : `Gesamtschnitt ${formatGrade(overall, 2)} · ${grades.length} Noten`}
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary h-9 flex-shrink-0 px-3">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Note
        </button>
      </div>

      <div className="px-4 pb-2 sm:px-5">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-ink-3">Trag deine Noten ein – der Schnitt pro Fach wird automatisch berechnet.</p>
        ) : (
          <ul className="divide-y divide-line/10">
            {rows.map(({ subject, list, average }) => (
              <li key={subject.id} className="flex items-center gap-3 py-3">
                <span className="h-10 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: subject.colorHex }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-ink">{subject.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {list.slice(0, 10).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Note ${formatGrade(g.value, g.value % 1 ? 1 : 0)} (${GRADE_KIND_LABELS[g.kind]}) löschen?`)) onDelete(g.id);
                        }}
                        title={`${GRADE_KIND_LABELS[g.kind]} · ${format(new Date(g.date), 'd. MMM', { locale: de })}${g.title ? ` · ${g.title}` : ''} – tippen zum Löschen`}
                        className={`flex h-7 min-w-[28px] items-center justify-center rounded-md border px-1 font-mono text-[13px] font-semibold ${
                          g.kind === 'schularbeit' ? 'border-ink/50' : 'border-line/15'
                        } ${gradeColor(g.value)}`}
                      >
                        {formatGrade(g.value, g.value % 1 ? 1 : 0)}
                      </button>
                    ))}
                  </div>
                  {average !== null && average >= 4.5 && <p className="mt-1 text-[12px] font-bold text-pen">Achtung: „Nicht genügend“ droht</p>}
                </div>
                {average !== null && (
                  <div className="flex-shrink-0 text-right">
                    <p className={`font-display text-[30px] font-bold leading-none tabular ${gradeColor(average)}`}>{formatGrade(average, 1)}</p>
                    <p className="text-[11px] text-ink-3">{GRADE_NAMES[Math.min(5, Math.max(1, Math.round(average)))]}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && <p className="pb-2 text-[12px] text-ink-3">Schularbeiten (dunkler Rand) zählen doppelt, Mitarbeit halb.</p>}
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="sm"
        title="Note eintragen"
        icon={<Award className="h-[18px] w-[18px]" />}
        footer={
          <>
            <button type="button" onClick={() => setIsOpen(false)} className="btn-ghost">
              Abbrechen
            </button>
            <button type="submit" form="grade-form" disabled={saving || !form.subjectId || !form.value} className="btn-primary">
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
          </>
        }
      >
        <form id="grade-form" onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="grade-subject" className="field-label">
              Fach
            </label>
            <select id="grade-subject" required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="field-input">
              <option value="">Fach wählen…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="field-label">Note</span>
            <div className="segmented grid-cols-5" role="group" aria-label="Note">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.value === value}
                  onClick={() => setForm({ ...form, value })}
                  className="segmented-item min-h-[52px] flex-col gap-0"
                  title={GRADE_NAMES[value]}
                >
                  <span className={`font-display text-[24px] font-bold leading-none ${gradeColor(value)}`}>{value}</span>
                </button>
              ))}
            </div>
            {form.value > 0 && <p className="mt-1.5 text-[13px] text-ink-3">{GRADE_NAMES[form.value]}</p>}
          </div>
          <div>
            <span className="field-label">Art</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Art">
              {GRADE_KINDS.map((kind) => (
                <button key={kind} type="button" aria-pressed={form.kind === kind} onClick={() => setForm({ ...form, kind })} className="tab border-line/15">
                  {GRADE_KIND_LABELS[kind]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[13px] text-ink-3">Zählt {DEFAULT_GRADE_WEIGHT[form.kind] === 2 ? 'doppelt' : DEFAULT_GRADE_WEIGHT[form.kind] === 0.5 ? 'halb' : 'einfach'}.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="grade-date" className="field-label">
                Datum
              </label>
              <input id="grade-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field-input font-mono text-[14px]" />
            </div>
            <div>
              <label htmlFor="grade-title" className="field-label">
                Notiz
              </label>
              <input id="grade-title" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="optional" className="field-input" />
            </div>
          </div>
        </form>
      </Modal>
    </section>
  );
};
