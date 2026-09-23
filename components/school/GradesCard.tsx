'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Award, BarChart3, ChevronDown, CloudOff, LineChart, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { GradeKind, Subject, VmmConfig } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { DEFAULT_GRADE_WEIGHT, GRADE_KINDS, GRADE_KIND_LABELS, GRADE_NAMES } from '@/lib/school';
import { unlinkedVmmGroups, type SubjectGrades, type UnifiedGrade } from '@/lib/school/grades';
import { buildGradeStats } from '@/lib/school/stats';
import type { VmmSubjectLink } from '@/lib/school/vmm-link';
import { StatsHistory, StatsOverview, StatsSubjects } from './GradeStatsViews';
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
  /** One row per subject that is taught, graded or known to VMM – built in the container. */
  rows: SubjectGrades[];
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
const gradeDigits = (value: number) => (value % 1 ? 1 : 0);

const gradeColor = (value: number) => (value >= 4.5 ? 'text-pen' : value >= 3.5 ? 'text-warn' : value <= 1.5 ? 'text-leaf' : 'text-ink');

/** One subject as a card: name, the grades so far and the average that comes out of them. */
function SubjectCard({ row, onOpen }: { row: SubjectGrades; onOpen: () => void }) {
  const { subject, grades: list, average, vmm: link } = row;
  const empty = list.length === 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-w-0 flex-col rounded-[12px] border p-3 text-left transition-colors hover:border-ink/25 ${
        empty ? 'border-dashed border-line/20' : 'border-line/10 bg-inset/50'
      }`}
      aria-label={empty ? `Note für ${subject.name} eintragen` : `Noten in ${subject.name} anzeigen`}
    >
      <span className="flex w-full items-start gap-2">
        <span className="mt-[3px] h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ backgroundColor: subject.colorHex }} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[14px] font-bold leading-tight text-ink">{subject.name}</span>
          <span className="mt-0.5 block text-[11px] text-ink-3">
            {empty ? 'Noch keine Note' : `${list.length} ${list.length === 1 ? 'Note' : 'Noten'}`}
            {link && ' · VMM'}
          </span>
        </span>
        {average === null ? (
          <Plus className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-3" />
        ) : (
          <span className="flex-shrink-0 text-right">
            <span className={`block font-display text-[26px] font-bold leading-none tabular ${gradeColor(average)}`}>{formatGrade(average, 1)}</span>
            <span className="text-[10px] text-ink-3">{GRADE_NAMES[Math.min(5, Math.max(1, Math.round(average)))]}</span>
          </span>
        )}
      </span>

      {!empty && (
        <span className="mt-2 flex flex-wrap gap-1">
          {list.slice(0, 10).map((g) => (
            <span
              key={g.id}
              title={`${GRADE_KIND_LABELS[g.kind]}${g.date ? ` · ${format(new Date(g.date), 'd. MMM', { locale: de })}` : ''}`}
              className={`flex h-6 min-w-[24px] items-center justify-center rounded-md px-1 font-mono text-[12px] font-semibold ${
                g.kind === 'schularbeit' ? 'border-2 border-ink/50' : 'border border-line/15'
              } ${g.source === 'vmm' ? 'bg-inset' : ''} ${gradeColor(g.value)}`}
            >
              {formatGrade(g.value, gradeDigits(g.value))}
            </span>
          ))}
          {list.length > 10 && <span className="self-center text-[11px] text-ink-3">+{list.length - 10}</span>}
        </span>
      )}

      {average !== null && average > 4.49 && <span className="mt-1.5 block text-[11px] font-bold text-pen">Achtung: „Nicht genügend“ droht</span>}
    </button>
  );
}

export const GradesCard: React.FC<GradesCardProps> = ({
  grades,
  rows,
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
  const [view, setView] = useState<'faecher' | 'statistik' | 'verlauf'>('faecher');
  const [isOpen, setIsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  // Fächer ohne Note sind da, drängeln sich aber nicht vor die, um die es geht.
  const [showEmpty, setShowEmpty] = useState(false);
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

  const openCreate = (subjectId = '') => {
    setForm({ subjectId, value: 0, kind: 'test', date: toDateInput(new Date()), title: '' });
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

  const orphans = useMemo(() => unlinkedVmmGroups(vmmLinks), [vmmLinks]);
  const stats = useMemo(() => buildGradeStats(grades, rows), [grades, rows]);
  const graded = rows.filter((r) => r.grades.length > 0);
  const ungraded = rows.filter((r) => r.grades.length === 0);
  const detail = rows.find((r) => r.subject.id === detailId) ?? null;

  const averages = graded.map((r) => r.average).filter((a): a is number => a !== null);
  const overall = averages.length ? averages.reduce((s, a) => s + a, 0) / averages.length : null;
  const vmmCount = grades.filter((g) => g.source === 'vmm').length;

  const openSubject = (row: SubjectGrades) => (row.grades.length === 0 ? openCreate(row.subject.id) : setDetailId(row.subject.id));

  return (
    <section className="card" aria-label="Noten">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
        <div className="min-w-0">
          <p className="eyebrow">Schule</p>
          <h2 className="card-title mt-1">Noten</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {overall === null
              ? `${rows.length} ${rows.length === 1 ? 'Fach' : 'Fächer'} · noch keine Noten`
              : `Gesamtschnitt ${formatGrade(overall, 2)} · ${grades.length} ${grades.length === 1 ? 'Note' : 'Noten'} in ${graded.length} von ${
                  rows.length
                } ${rows.length === 1 ? 'Fach' : 'Fächern'}`}
            {vmmCount > 0 && ` · ${vmmCount} aus VMM`}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {vmm?.isConnected ? (
            <button
              type="button"
              onClick={syncVmm}
              disabled={syncing}
              className="icon-btn h-9 w-9"
              aria-label="Noten aus VMM abrufen"
              title="Noten aus View My Marks abrufen"
            >
              <RefreshCw className={`h-[17px] w-[17px] ${syncing ? 'animate-spin' : ''}`} />
            </button>
          ) : (
            <button type="button" onClick={onConnectVmm} className="btn-ghost h-9 px-2 text-[13px]" title="View My Marks verbinden">
              <CloudOff className="h-4 w-4" /> VMM
            </button>
          )}
          <button type="button" onClick={() => openCreate()} className="btn-primary h-9 px-3">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Note
          </button>
        </div>
      </div>

      {grades.length > 0 && (
        <div className="px-4 pb-3 sm:px-5">
          <div className="segmented grid-cols-3 sm:inline-grid" role="group" aria-label="Ansicht">
            <button type="button" aria-pressed={view === 'faecher'} onClick={() => setView('faecher')} className="segmented-item px-3">
              <Award className="h-4 w-4" /> Fächer
            </button>
            <button type="button" aria-pressed={view === 'statistik'} onClick={() => setView('statistik')} className="segmented-item px-3">
              <BarChart3 className="h-4 w-4" /> Statistik
            </button>
            <button type="button" aria-pressed={view === 'verlauf'} onClick={() => setView('verlauf')} className="segmented-item px-3">
              <LineChart className="h-4 w-4" /> Verlauf
            </button>
          </div>
        </div>
      )}

      {vmm && !vmm.isConnected && vmmCount > 0 && (
        <p className="mx-4 mb-2 rounded-[10px] bg-warn/10 p-3 text-[13px] text-warn sm:mx-5">
          Die VMM-Sitzung ist abgelaufen – die Noten von dort sind der letzte Stand.
        </p>
      )}

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        {view === 'statistik' && (
          <>
            <StatsOverview stats={stats} />
            <StatsSubjects stats={stats} />
          </>
        )}

        {view === 'verlauf' && <StatsHistory stats={stats} />}

        {view === 'faecher' && (
          <>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-ink-3">
                Sobald der Stundenplan da ist, steht hier jedes Fach. Trag Noten ein oder verbinde View My Marks – der Schnitt pro Fach wird
                automatisch berechnet.
              </p>
            ) : (
              <>
                {graded.length > 0 && (
                  <>
                    <p className="eyebrow pb-2">Mit Noten · {graded.length}</p>
                    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                      {graded.map((row) => (
                        <SubjectCard key={row.subject.id} row={row} onOpen={() => openSubject(row)} />
                      ))}
                    </div>
                  </>
                )}

                {ungraded.length > 0 && (
                  <div className={graded.length > 0 ? 'mt-4 border-t border-line/10 pt-3' : ''}>
                    <button
                      type="button"
                      onClick={() => setShowEmpty((v) => !v)}
                      aria-expanded={showEmpty}
                      className="flex w-full items-center justify-between gap-2 pb-2 text-left"
                    >
                      <span className="eyebrow">Noch keine Note · {ungraded.length}</span>
                      <ChevronDown className={`h-4 w-4 flex-shrink-0 text-ink-3 transition-transform ${showEmpty ? 'rotate-180' : ''}`} />
                    </button>
                    {showEmpty ? (
                      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {ungraded.map((row) => (
                          <SubjectCard key={row.subject.id} row={row} onOpen={() => openSubject(row)} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {ungraded.map(({ subject }) => (
                          <button key={subject.id} type="button" onClick={() => openCreate(subject.id)} className="chip gap-1.5 hover:border-ink/30">
                            <span className="h-2 w-2 flex-shrink-0 rounded-[2px]" style={{ backgroundColor: subject.colorHex }} />
                            {subject.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {orphans.length > 0 && (
                  <div className="mt-4 rounded-[10px] border border-warn/25 bg-warn/5 p-3">
                    <p className="text-[13px] font-bold text-ink">Aus VMM, aber keinem Fach zugeordnet</p>
                    <ul className="mt-1 space-y-0.5">
                      {orphans.map((link) => (
                        <li key={link.group.id} className="flex items-baseline justify-between gap-3 text-[13px] text-ink-2">
                          <span className="min-w-0 truncate">{link.group.subjectName ?? link.group.name}</span>
                          <span className="tabular flex-shrink-0 font-bold">
                            {link.graded.length} {link.graded.length === 1 ? 'Note' : 'Noten'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-[12px] text-ink-3">Trag das Untis-Kürzel beim Fach nach, dann landen diese Noten beim richtigen Fach.</p>
                  </div>
                )}

                {graded.length > 0 && (
                  <p className="mt-3 text-[12px] text-ink-3">
                    Schularbeiten (dunkler Rand) zählen doppelt, Mitarbeit halb. Noten mit grauem Feld kommen aus View My Marks und lassen sich hier
                    nicht ändern.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetailId(null)}
        size="sm"
        title={detail?.subject.name ?? ''}
        subtitle={
          detail && detail.average !== null
            ? `Schnitt ${formatGrade(detail.average, 2)} · ${GRADE_NAMES[Math.min(5, Math.max(1, Math.round(detail.average)))]}`
            : undefined
        }
        icon={<span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: detail?.subject.colorHex }} />}
        footer={
          detail && (
            <button type="button" onClick={() => { setDetailId(null); openCreate(detail.subject.id); }} className="btn-primary">
              <Plus className="h-4 w-4" /> Note eintragen
            </button>
          )
        }
      >
        {detail && (
          <ul className="divide-y divide-line/10">
            {detail.grades.map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-2">
                <span
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] font-mono text-[15px] font-bold ${
                    g.kind === 'schularbeit' ? 'border-2 border-ink/50' : 'border border-line/15'
                  } ${g.source === 'vmm' ? 'bg-inset' : ''} ${gradeColor(g.value)}`}
                >
                  {formatGrade(g.value, gradeDigits(g.value))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-ink">{g.title ?? GRADE_KIND_LABELS[g.kind]}</span>
                  <span className="block truncate text-[12px] text-ink-3">
                    {GRADE_KIND_LABELS[g.kind]}
                    {g.date && ` · ${format(new Date(g.date), 'd. MMM yyyy', { locale: de })}`}
                    {g.weight !== 1 && ` · ×${g.weight}`}
                    {g.source === 'vmm' && ' · View My Marks'}
                  </span>
                </span>
                {g.source === 'app' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Note ${formatGrade(g.value, gradeDigits(g.value))} (${GRADE_KIND_LABELS[g.kind]}) löschen?`)) onDelete(g.id);
                    }}
                    className="icon-btn h-8 w-8 text-ink-3 hover:text-pen"
                    aria-label="Note löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="w-8 flex-shrink-0" />
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

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
            <p className="mt-1.5 text-[13px] text-ink-3">
              Zählt {DEFAULT_GRADE_WEIGHT[form.kind] === 2 ? 'doppelt' : DEFAULT_GRADE_WEIGHT[form.kind] === 0.5 ? 'halb' : 'einfach'}.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="grade-date" className="field-label">
                Datum
              </label>
              <input
                id="grade-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="field-input font-mono text-[14px]"
              />
            </div>
            <div>
              <label htmlFor="grade-title" className="field-label">
                Notiz
              </label>
              <input
                id="grade-title"
                value={form.title}
                maxLength={120}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="optional"
                className="field-input"
              />
            </div>
          </div>
        </form>
      </Modal>
    </section>
  );
};
