'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Award, CloudOff, Plus, RefreshCw } from 'lucide-react';
import type { GradeKind, Subject, VmmConfig } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { DEFAULT_GRADE_WEIGHT, GRADE_KINDS, GRADE_KIND_LABELS, GRADE_NAMES } from '@/lib/school';
import { bySubject, type UnifiedGrade } from '@/lib/school/grades';
import type { VmmSubjectLink } from '@/lib/school/vmm-link';
import { api, errorMessage } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { toDateInput, fromDateInput } from '@/lib/format';

export interface GradePayload {
  subjectId: string;
  value: number;
  kind: GradeKind;
  date: string;
  title: string | null;
}

interface GradesCardProps {
  /** Manual grades and VMM marks already merged. */
  grades: UnifiedGrade[];
  subjects: Subject[];
  vmm: VmmConfig | null;
  vmmLinks: VmmSubjectLink[];
  onVmmChanged: (config: VmmConfig) => void;
  onConnectVmm: () => void;
  /** Opens the form, optionally prefilled (e.g. from a past exam). */
  request: Partial<GradePayload> | null;
  onRequestHandled: () => void;
  onSave: (payload: GradePayload) => Promise<void>;
  onDelete: (id: string) => void;
}

const formatGrade = (value: number, digits = 0) => value.toFixed(digits).replace('.', ',');

const gradeColor = (value: number) =>
  value >= 4.5 ? 'text-pen' : value >= 3.5 ? 'text-warn' : value <= 1.5 ? 'text-leaf' : 'text-ink';

export const GradesCard: React.FC<GradesCardProps> = ({
  grades,
  subjects,
  vmm,
  vmmLinks,
  onVmmChanged,
  onConnectVmm,
  request,
  onRequestHandled,
  onSave,
  onDelete,
}) => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
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

  const syncVmm = async () => {
    setSyncing(true);
    try {
      const result = await api<{ message?: string; config?: VmmConfig }>('/api/v1/vmm', { body: { action: 'sync' } });
      if (result.config) onVmmChanged(result.config);
      toast(result.message ?? 'Noten aktualisiert');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const rows = useMemo(() => bySubject(grades, subjects, vmmLinks), [grades, subjects, vmmLinks]);

  const averages = rows.map((r) => r.average).filter((a): a is number => a !== null);
  const overall = averages.length ? averages.reduce((s, a) => s + a, 0) / averages.length : null;
  const vmmCount = grades.filter((g) => g.source === 'vmm').length;

  return (
    <section className="card" aria-label="Noten">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div className="min-w-0">
          <p className="eyebrow">Schule</p>
          <h2 className="card-title mt-1">Noten</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {overall === null ? 'Noch keine Noten' : `Gesamtschnitt ${formatGrade(overall, 2)} · ${grades.length} ${grades.length === 1 ? 'Note' : 'Noten'}`}
            {vmmCount > 0 && ` · ${vmmCount} aus VMM`}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {vmm?.isConnected ? (
            <button type="button" onClick={syncVmm} disabled={syncing} className="icon-btn h-9 w-9" aria-label="Noten aus VMM abrufen" title="Noten aus VMM abrufen">
              <RefreshCw className={`h-[17px] w-[17px] ${syncing ? 'animate-spin' : ''}`} />
            </button>
          ) : (
            <button type="button" onClick={onConnectVmm} className="btn-ghost h-9 px-2 text-[13px]" title="View My Marks verbinden">
              <CloudOff className="h-4 w-4" /> VMM
            </button>
          )}
          <button type="button" onClick={openCreate} className="btn-primary h-9 px-3">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Note
          </button>
        </div>
      </div>

      {vmm && !vmm.isConnected && vmmCount > 0 && (
        <p className="mx-4 mb-2 rounded-[10px] bg-warn/10 p-3 text-[13px] text-warn sm:mx-5">
          Die VMM-Sitzung ist abgelaufen – die Noten von dort sind der letzte Stand.
        </p>
      )}

      <div className="px-4 pb-2 sm:px-5">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-ink-3">
            Trag deine Noten ein oder verbinde View My Marks – der Schnitt pro Fach wird automatisch berechnet.
          </p>
        ) : (
          <ul className="divide-y divide-line/10">
            {rows.map(({ subject, grades: list, average, vmm: link }) => {
              const open = openSubjectId === subject.id;
              return (
                <li key={subject.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: subject.colorHex }} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2 truncate text-[15px] font-bold text-ink">
                        {subject.name}
                        {link && <span className="text-[11px] font-normal text-ink-3">VMM</span>}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {list.slice(0, 12).map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              if (g.source === 'vmm') {
                                setOpenSubjectId(open ? null : subject.id);
                                return;
                              }
                              if (window.confirm(`Note ${formatGrade(g.value, g.value % 1 ? 1 : 0)} (${GRADE_KIND_LABELS[g.kind]}) löschen?`)) onDelete(g.id);
                            }}
                            title={`${GRADE_KIND_LABELS[g.kind]}${g.date ? ` · ${format(new Date(g.date), 'd. MMM', { locale: de })}` : ''}${
                              g.title ? ` · ${g.title}` : ''
                            } – ${g.source === 'vmm' ? 'aus View My Marks' : 'tippen zum Löschen'}`}
                            className={`flex h-7 min-w-[28px] items-center justify-center rounded-md px-1 font-mono text-[13px] font-semibold ${
                              g.kind === 'schularbeit' ? 'border-2 border-ink/50' : 'border border-line/15'
                            } ${g.source === 'vmm' ? 'bg-inset' : ''} ${gradeColor(g.value)}`}
                          >
                            {formatGrade(g.value, g.value % 1 ? 1 : 0)}
                          </button>
                        ))}
                        {list.length === 0 && <span className="text-[13px] text-ink-3">Noch keine Note</span>}
                      </div>
                      {average !== null && average > 4.49 && <p className="mt-1 text-[12px] font-bold text-pen">Achtung: „Nicht genügend“ droht</p>}
                    </div>
                    {average !== null && (
                      <button
                        type="button"
                        onClick={() => setOpenSubjectId(open ? null : subject.id)}
                        className="flex-shrink-0 text-right"
                        aria-expanded={open}
                        aria-label={`Noten in ${subject.name} anzeigen`}
                      >
                        <span className={`block font-display text-[30px] font-bold leading-none tabular ${gradeColor(average)}`}>{formatGrade(average, 1)}</span>
                        <span className="text-[11px] text-ink-3">{GRADE_NAMES[Math.min(5, Math.max(1, Math.round(average)))]}</span>
                      </button>
                    )}
                  </div>

                  {open && list.length > 0 && (
                    <ul className="ml-4 mt-2 space-y-1 rounded-[10px] bg-inset p-3 text-[13px]">
                      {list.map((g) => (
                        <li key={`detail-${g.id}`} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-ink-2">
                            {g.title ?? GRADE_KIND_LABELS[g.kind]}
                            {g.date && ` · ${format(new Date(g.date), 'd. MMM yyyy', { locale: de })}`}
                            {g.weight !== 1 && ` · ×${g.weight}`}
                            {g.source === 'vmm' && ' · VMM'}
                          </span>
                          <span className={`tabular font-bold ${gradeColor(g.value)}`}>{formatGrade(g.value, g.value % 1 ? 1 : 0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {rows.length > 0 && (
          <p className="pb-2 text-[12px] text-ink-3">
            Schularbeiten (dunkler Rand) zählen doppelt, Mitarbeit halb. Noten mit grauem Feld kommen aus View My Marks und lassen sich hier nicht ändern.
          </p>
        )}
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
