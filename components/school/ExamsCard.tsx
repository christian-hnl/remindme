'use client';

import React, { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarDays, ChevronDown, GraduationCap, Plus, RadioTower, Sparkles, Trash2 } from 'lucide-react';
import type { Exam, ExamKind, Subject } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { CheckButton } from '@/components/ui/CheckButton';
import { EXAM_KINDS, EXAM_KIND_LABELS, STUDY_LEAD_DAYS, countdownLabel, daysUntil } from '@/lib/school';
import { fromDateInput, toDateInput } from '@/lib/format';

export interface ExamPayload {
  title: string;
  kind: ExamKind;
  date: string;
  subjectId: string | null;
  topics: string | null;
}

interface ExamsCardProps {
  exams: Exam[];
  subjects: Subject[];
  createRequest: boolean;
  onCreateRequestHandled: () => void;
  onSave: (payload: ExamPayload, id?: string) => Promise<void>;
  onDelete: (id: string) => void;
  onToggleDone: (exam: Exam) => void;
  onEnterGrade: (exam: Exam) => void;
  onAddTopic: (examId: string, title: string) => void;
  onToggleTopic: (examId: string, topicId: string, isDone: boolean) => void;
  onDeleteTopic: (examId: string, topicId: string) => void;
  /** The study plan built from these exams – lives in the same card, one tab over. */
  plan?: React.ReactNode;
}

const emptyForm = () => ({
  title: '',
  kind: 'schularbeit' as ExamKind,
  date: toDateInput(addDays(new Date(), 7)),
  subjectId: '',
  topics: '',
});

export const ExamsCard: React.FC<ExamsCardProps> = ({
  exams,
  subjects,
  createRequest,
  onCreateRequestHandled,
  onSave,
  onDelete,
  onToggleDone,
  onEnterGrade,
  onAddTopic,
  onToggleTopic,
  onDeleteTopic,
  plan,
}) => {
  const [tab, setTab] = useState<'termine' | 'plan'>('termine');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  // Keep the checklist in the open modal in sync as topics get toggled/added from outside.
  const current = editing ? exams.find((e) => e.id === editing.id) ?? editing : null;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setTopicInput('');
    setIsOpen(true);
  };

  const openEdit = (exam: Exam) => {
    setEditing(exam);
    setForm({
      title: exam.title,
      kind: exam.kind,
      date: toDateInput(new Date(exam.date)),
      subjectId: exam.subjectId ?? '',
      topics: exam.topics ?? '',
    });
    setTopicInput('');
    setIsOpen(true);
  };

  const addTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !topicInput.trim()) return;
    onAddTopic(editing.id, topicInput.trim());
    setTopicInput('');
  };

  useEffect(() => {
    if (!createRequest) return;
    openCreate();
    onCreateRequestHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRequest]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) return;
    const date = fromDateInput(form.date);
    date.setHours(8, 0, 0, 0);
    setSaving(true);
    try {
      await onSave(
        { title: form.title.trim(), kind: form.kind, date: date.toISOString(), subjectId: form.subjectId || null, topics: form.topics.trim() || null },
        editing?.id
      );
      setIsOpen(false);
    } catch {
      // toast from container
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();
  const upcoming = exams
    .filter((e) => !e.isDone && daysUntil(new Date(e.date), now) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = exams
    .filter((e) => e.isDone || daysUntil(new Date(e.date), now) < 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);

  return (
    <section id="exams-card" className="card" aria-label="Prüfungen">
      <div className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div>
          <p className="eyebrow">Schule</p>
          <h2 className="card-title mt-1">Prüfungen</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {upcoming.length === 0
              ? 'Nichts angekündigt'
              : `Nächste: ${upcoming[0].title} ${countdownLabel(daysUntil(new Date(upcoming[0].date), now))}`}
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary h-9 flex-shrink-0 px-3">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Neu
        </button>
      </div>

      {plan && (
        <div className="px-4 pb-3 pt-2 sm:px-5">
          <div className="segmented grid-cols-2 sm:inline-grid" role="group" aria-label="Ansicht">
            <button type="button" aria-pressed={tab === 'termine'} onClick={() => setTab('termine')} className="segmented-item px-3">
              <CalendarDays className="h-4 w-4" /> Termine
            </button>
            <button type="button" aria-pressed={tab === 'plan'} onClick={() => setTab('plan')} className="segmented-item px-3">
              <Sparkles className="h-4 w-4" /> Lernplan
            </button>
          </div>
        </div>
      )}

      <div className={`px-4 pb-2 sm:px-5 ${plan && tab === 'plan' ? 'hidden' : ''}`}>
        {upcoming.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-ink-3">Trag Schularbeiten und Tests ein – dann siehst du, wann du lernen solltest.</p>
        ) : (
          <ul className="divide-y divide-line/10">
            {upcoming.map((exam) => {
              const date = new Date(exam.date);
              const days = daysUntil(date, now);
              const lead = STUDY_LEAD_DAYS[exam.kind];
              const urgency =
                days <= 2 ? 'border-pen/40 bg-pen/10 text-pen' : days <= lead ? 'border-warn/40 bg-warn/10 text-warn' : 'border-line/15 text-ink-2';
              return (
                <li key={exam.id} id={`exam-${exam.id}`} className="flex items-start gap-3 py-3">
                  <div className={`flex w-14 flex-shrink-0 flex-col items-center rounded-[10px] border py-1.5 ${urgency}`}>
                    <span className="font-display text-[24px] font-bold leading-none tabular">{days === 0 ? '!' : days}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{days === 0 ? 'heute' : days === 1 ? 'Tag' : 'Tage'}</span>
                  </div>
                  <button type="button" onClick={() => openEdit(exam)} className="min-w-0 flex-1 rounded-md text-left">
                    <span className="flex items-center gap-2">
                      {exam.subject && <span className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ backgroundColor: exam.subject.colorHex }} />}
                      <span className="truncate text-[15px] font-bold text-ink">{exam.title}</span>
                      {exam.isUntisSync && (
                        <span className="chip flex-shrink-0 gap-1 text-[10px]" title="Automatisch aus WebUntis erkannt">
                          <RadioTower className="h-3 w-3" /> Untis
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-ink-2">
                      {EXAM_KIND_LABELS[exam.kind]} · {format(date, 'EEEE, d. MMM', { locale: de })}
                      {exam.topicItems.length > 0 && ` · ${exam.topicItems.filter((t) => t.isDone).length}/${exam.topicItems.length} Themen`}
                    </span>
                    <span className={`mt-1 block text-[13px] font-bold ${days <= lead ? 'text-accent' : 'text-ink-3'}`}>
                      {days <= lead ? 'Jetzt lernen' : `Lernen ab ${format(addDays(date, -lead), 'EEE d. MMM', { locale: de })}`}
                    </span>
                    {exam.topics && <span className="mt-1 line-clamp-2 block whitespace-pre-line text-[13px] text-ink-3">{exam.topics}</span>}
                  </button>
                  <CheckButton checked={false} onChange={() => onToggleDone(exam)} label="Als geschrieben markieren" className="mt-1" />
                </li>
              );
            })}
          </ul>
        )}

        {past.length > 0 && (
          <div className="border-t border-line/10 py-2">
            <button type="button" onClick={() => setShowPast((v) => !v)} className="btn-ghost -ml-2 h-8 px-2 text-[13px]" aria-expanded={showPast}>
              <ChevronDown className={`h-4 w-4 transition-transform ${showPast ? '' : '-rotate-90'}`} />
              Vergangene ({past.length})
            </button>
            {showPast && (
              <ul className="mt-1">
                {past.map((exam) => (
                  <li key={exam.id} className="flex items-center gap-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink-2">
                      {exam.title} <span className="text-ink-3">· {format(new Date(exam.date), 'd. MMM', { locale: de })}</span>
                    </span>
                    <button type="button" onClick={() => onEnterGrade(exam)} className="btn-ghost h-8 px-2 text-[13px] text-accent">
                      Note eintragen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`„${exam.title}“ löschen?`)) onDelete(exam.id);
                      }}
                      className="icon-btn h-8 w-8 hover:text-pen"
                      aria-label="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {plan && tab === 'plan' && <div className="px-4 pb-4 sm:px-5">{plan}</div>}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="sm"
        title={editing ? 'Prüfung bearbeiten' : 'Neue Prüfung'}
        icon={<GraduationCap className="h-[18px] w-[18px]" />}
        footer={
          <>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  onDelete(editing.id);
                  setIsOpen(false);
                }}
                className="btn-danger mr-auto"
              >
                <Trash2 className="h-4 w-4" /> Löschen
              </button>
            )}
            <button type="button" onClick={() => setIsOpen(false)} className="btn-ghost">
              Abbrechen
            </button>
            <button type="submit" form="exam-form" disabled={saving} className="btn-primary">
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
          </>
        }
      >
        <form id="exam-form" onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exam-subject" className="field-label">
                Fach
              </label>
              <select id="exam-subject" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="field-input">
                <option value="">Kein Fach</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="exam-date" className="field-label">
                Datum
              </label>
              <input id="exam-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field-input font-mono text-[14px]" />
            </div>
          </div>
          <div>
            <span className="field-label">Art</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Art">
              {EXAM_KINDS.map((kind) => (
                <button key={kind} type="button" aria-pressed={form.kind === kind} onClick={() => setForm({ ...form, kind })} className="tab border-line/15">
                  {EXAM_KIND_LABELS[kind]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="exam-title" className="field-label">
              Titel <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="exam-title"
              value={form.title}
              maxLength={120}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="z. B. 2. Schularbeit"
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="exam-topics" className="field-label">
              Stoff <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="exam-topics"
              rows={3}
              value={form.topics}
              onChange={(e) => setForm({ ...form, topics: e.target.value })}
              placeholder="Kapitel, Themen, Seiten…"
              className="field-input resize-y"
            />
          </div>
        </form>

        {current && (
          <div className="mt-5 border-t border-line/10 pt-5">
            <span className="field-label">Themen zum Abhaken</span>
            {current.topicItems.length > 0 && (
              <ul className="mb-2 space-y-1">
                {current.topicItems.map((topic) => (
                  <li key={topic.id} className="group flex items-center gap-2.5 py-0.5">
                    <CheckButton
                      checked={topic.isDone}
                      onChange={() => onToggleTopic(current.id, topic.id, !topic.isDone)}
                      label={topic.isDone ? `${topic.title} wieder öffnen` : `${topic.title} erledigt`}
                    />
                    <span className={`min-w-0 flex-1 text-[14px] ${topic.isDone ? 'text-ink-3 line-through' : 'text-ink'}`}>{topic.title}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteTopic(current.id, topic.id)}
                      className="icon-btn h-7 w-7 hover:text-pen sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      aria-label={`${topic.title} löschen`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addTopic} className="flex gap-2">
              <label htmlFor="exam-topic-input" className="sr-only">
                Neues Thema
              </label>
              <input
                id="exam-topic-input"
                value={topicInput}
                maxLength={200}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="z. B. Integralrechnung"
                className="field-input h-10 py-0"
              />
              <button type="submit" disabled={!topicInput.trim()} className="btn-primary h-10 w-10 flex-shrink-0 px-0" aria-label="Thema hinzufügen">
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </Modal>
    </section>
  );
};
