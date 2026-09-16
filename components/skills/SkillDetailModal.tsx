'use client';

import React, { useEffect, useState } from 'react';
import { format, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import type { Skill, SkillResourceKind, SkillStatus } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { CheckButton } from '@/components/ui/CheckButton';
import { useToast } from '@/components/ui/Toast';
import { Progress } from '@/components/wealth/charts';
import { api, errorMessage } from '@/lib/client';
import { fromDateInput, toDateInput } from '@/lib/format';
import {
  RESOURCE_KINDS,
  RESOURCE_KIND_LABELS,
  SKILL_CATEGORIES,
  SKILL_STATUSES,
  SKILL_STATUS_LABELS,
  WEEKLY_GOALS,
  formatMinutes,
} from '@/lib/skills';

interface SkillDetailModalProps {
  skill: Skill | null;
  onClose: () => void;
  onUpdated: (skill: Skill) => void;
  onDeleted: (id: string) => void;
  onDone: () => void;
}

type Section = 'plan' | 'material' | 'time' | 'about';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'plan', label: 'Schritte' },
  { id: 'material', label: 'Material' },
  { id: 'time', label: 'Lernzeit' },
  { id: 'about', label: 'Details' },
];

const KIND_EMOJI: Record<SkillResourceKind, string> = { video: '🎬', course: '🎓', book: '📖', app: '📱', article: '📰', other: '🔗' };

export function SkillDetailModal({ skill, onClose, onUpdated, onDeleted, onDone }: SkillDetailModalProps) {
  const toast = useToast();
  const [section, setSection] = useState<Section>('plan');
  const [busy, setBusy] = useState(false);

  // Details form
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [category, setCategory] = useState('');
  const [why, setWhy] = useState('');
  const [weekly, setWeekly] = useState(60);
  const [targetDate, setTargetDate] = useState('');

  // Inline forms
  const [stepTitle, setStepTitle] = useState('');
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resKind, setResKind] = useState<SkillResourceKind>('video');
  const [minutes, setMinutes] = useState('30');
  const [sessionDate, setSessionDate] = useState('');
  const [note, setNote] = useState('');

  const skillId = skill?.id;
  useEffect(() => {
    if (!skill) return;
    setSection(skill.steps.length === 0 && skill.status !== 'done' ? 'plan' : skill.status === 'active' ? 'time' : 'plan');
    setTitle(skill.title);
    setEmoji(skill.emoji);
    setCategory(skill.category);
    setWhy(skill.why ?? '');
    setWeekly(skill.weeklyMinutes);
    setTargetDate(skill.targetDate ? toDateInput(new Date(skill.targetDate)) : '');
    setStepTitle('');
    setResTitle('');
    setResUrl('');
    setMinutes('30');
    setSessionDate(toDateInput(new Date()));
    setNote('');
    // Only reset when a different skill is opened, not on every update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId]);

  if (!skill) return null;

  const call = async (path: string, method: string, body?: unknown) => {
    setBusy(true);
    try {
      const updated = await api<Skill>(`/api/v1/skills/${skill.id}${path}`, { method, body });
      onUpdated(updated);
      return updated;
    } catch (error) {
      toast(errorMessage(error), 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: SkillStatus) => {
    if (status === skill.status) return;
    const updated = await call('', 'PATCH', { status });
    if (updated && status === 'done') {
      onDone();
      toast(`🎉 ${updated.title} geschafft!`);
    }
  };

  const saveDetails = async () => {
    const updated = await call('', 'PATCH', {
      title: title.trim(),
      emoji: emoji.trim(),
      category,
      why: why.trim(),
      weeklyMinutes: weekly,
      targetDate: targetDate ? fromDateInput(targetDate).toISOString() : null,
    });
    if (updated) toast('Gespeichert');
  };

  const addStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepTitle.trim()) return;
    if (await call('/steps', 'POST', { title: stepTitle.trim() })) setStepTitle('');
  };

  const addResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() && !resUrl.trim()) return;
    if (await call('/resources', 'POST', { title: resTitle.trim(), url: resUrl.trim(), kind: resKind })) {
      setResTitle('');
      setResUrl('');
    }
  };

  const logSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseInt(minutes, 10);
    if (!(value > 0)) return toast('Bitte Minuten eingeben', 'error');
    const date = sessionDate === toDateInput(new Date()) ? new Date() : new Date(fromDateInput(sessionDate).setHours(18));
    if (await call('/sessions', 'POST', { minutes: value, date: date.toISOString(), note: note.trim() })) {
      setNote('');
      toast(`+${value} min eingetragen`);
    }
  };

  const stepsDone = skill.steps.filter((s) => s.isDone).length;
  const weekMinutes = skill.sessions.filter((s) => new Date(s.date) >= startOfWeek(new Date(), { weekStartsOn: 1 })).reduce((sum, s) => sum + s.minutes, 0);
  const detailsDirty =
    title.trim() !== skill.title ||
    emoji.trim() !== skill.emoji ||
    category !== skill.category ||
    why.trim() !== (skill.why ?? '') ||
    weekly !== skill.weeklyMinutes ||
    targetDate !== (skill.targetDate ? toDateInput(new Date(skill.targetDate)) : '');

  return (
    <Modal
      isOpen={!!skill}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <span aria-hidden>{skill.emoji}</span> {skill.title}
        </span>
      }
      subtitle={`${skill.category} · ${formatMinutes(skill.totalMinutes)} gelernt${skill.steps.length ? ` · ${stepsDone}/${skill.steps.length} Schritte` : ''}`}
      footer={
        <>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`„${skill.title}“ mit allen Schritten und Lernzeiten löschen?`)) return;
              try {
                await api(`/api/v1/skills/${skill.id}`, { method: 'DELETE' });
                onDeleted(skill.id);
              } catch (error) {
                toast(errorMessage(error), 'error');
              }
            }}
            className="btn-danger mr-auto"
          >
            <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Löschen</span>
          </button>
          {section === 'about' && detailsDirty ? (
            <button type="button" onClick={saveDetails} disabled={busy || !title.trim()} className="btn-primary">
              Speichern
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn-secondary">
              Fertig
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="segmented grid-cols-2 sm:grid-cols-4" role="group" aria-label="Status">
          {SKILL_STATUSES.map((s) => (
            <button key={s} type="button" aria-pressed={skill.status === s} onClick={() => setStatus(s)} disabled={busy} className="segmented-item text-[13px]">
              {SKILL_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Bereiche">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={section === s.id} onClick={() => setSection(s.id)} className="tab">
              {s.label}
              {s.id === 'plan' && skill.steps.length > 0 && <span className="font-mono text-[11px] opacity-70">{skill.steps.length}</span>}
              {s.id === 'material' && skill.resources.length > 0 && <span className="font-mono text-[11px] opacity-70">{skill.resources.length}</span>}
            </button>
          ))}
        </div>

        {section === 'plan' && (
          <div>
            {skill.steps.length > 0 && (
              <div className="mb-3">
                <Progress value={stepsDone / skill.steps.length} tone="leaf" />
              </div>
            )}
            {skill.steps.length === 0 && (
              <p className="mb-3 text-[14px] text-ink-2">
                Zerleg das große Ziel in kleine, machbare Schritte – z. B. „5 Akkorde lernen“, „Erstes Lied spielen“, „30 Tage am Stück üben“.
              </p>
            )}
            <ul className="divide-y divide-line/10">
              {skill.steps.map((step) => (
                <li key={step.id} className="group flex items-center gap-3 py-2">
                  <CheckButton
                    checked={step.isDone}
                    onChange={() => {
                      onUpdated({ ...skill, steps: skill.steps.map((s) => (s.id === step.id ? { ...s, isDone: !s.isDone } : s)) });
                      if (!step.isDone) onDone();
                      call(`/steps/${step.id}`, 'PATCH', { isDone: !step.isDone });
                    }}
                    label={step.isDone ? `${step.title} wieder öffnen` : `${step.title} erledigt`}
                  />
                  <span className={`min-w-0 flex-1 text-[15px] ${step.isDone ? 'text-ink-3 line-through' : 'text-ink'}`}>{step.title}</span>
                  <button type="button" onClick={() => call(`/steps/${step.id}`, 'DELETE')} className="icon-btn h-8 w-8 hover:text-pen sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label={`${step.title} löschen`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={addStep} className="mt-2 flex gap-2">
              <label htmlFor="step-title" className="sr-only">
                Neuer Schritt
              </label>
              <input id="step-title" value={stepTitle} maxLength={200} onChange={(e) => setStepTitle(e.target.value)} placeholder="Nächster Schritt…" className="field-input h-10 py-0" />
              <button type="submit" disabled={busy || !stepTitle.trim()} className="btn-primary h-10 w-10 flex-shrink-0 px-0" aria-label="Schritt hinzufügen">
                <Plus className="h-5 w-5" />
              </button>
            </form>
          </div>
        )}

        {section === 'material' && (
          <div>
            {skill.resources.length === 0 && <p className="mb-3 text-[14px] text-ink-2">Sammle YouTube-Videos, Kurse, Bücher und Apps an einem Ort.</p>}
            <ul className="divide-y divide-line/10">
              {skill.resources.map((r) => (
                <li key={r.id} className="group flex items-center gap-3 py-2">
                  <CheckButton checked={r.isDone} onChange={() => call(`/resources/${r.id}`, 'PATCH', { isDone: !r.isDone })} label={r.isDone ? 'Als offen markieren' : 'Als durchgearbeitet markieren'} />
                  <span className="text-[18px]" aria-hidden>
                    {KIND_EMOJI[r.kind]}
                  </span>
                  <span className="min-w-0 flex-1">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className={`inline-flex max-w-full items-center gap-1 text-[15px] font-bold hover:underline ${r.isDone ? 'text-ink-3' : 'text-accent'}`}>
                        <span className="truncate">{r.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className={`block truncate text-[15px] font-bold ${r.isDone ? 'text-ink-3' : 'text-ink'}`}>{r.title}</span>
                    )}
                    <span className="block text-[12px] text-ink-3">{RESOURCE_KIND_LABELS[r.kind]}</span>
                  </span>
                  <button type="button" onClick={() => call(`/resources/${r.id}`, 'DELETE')} className="icon-btn h-8 w-8 hover:text-pen sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label={`${r.title} löschen`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={addResource} className="mt-3 space-y-2 rounded-[12px] border border-line/10 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input aria-label="Titel" value={resTitle} maxLength={200} onChange={(e) => setResTitle(e.target.value)} placeholder="Titel (optional)" className="field-input h-10 py-0" />
                <input aria-label="Link" value={resUrl} maxLength={1000} onChange={(e) => setResUrl(e.target.value)} placeholder="Link, z. B. youtube.com/…" inputMode="url" className="field-input h-10 py-0" />
              </div>
              <div className="flex gap-2">
                <select aria-label="Art" value={resKind} onChange={(e) => setResKind(e.target.value as SkillResourceKind)} className="field-input h-10 py-0">
                  {RESOURCE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_EMOJI[k]} {RESOURCE_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={busy || (!resTitle.trim() && !resUrl.trim())} className="btn-primary h-10 flex-shrink-0">
                  <Plus className="h-4 w-4" /> Hinzufügen
                </button>
              </div>
            </form>
          </div>
        )}

        {section === 'time' && (
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-[12px] bg-inset px-3 py-2.5">
                <p className="eyebrow text-[11px]">Diese Woche</p>
                <p className="font-mono text-[20px] font-medium text-ink tabular">{formatMinutes(weekMinutes)}</p>
                {skill.weeklyMinutes > 0 && <Progress value={weekMinutes / skill.weeklyMinutes} tone={weekMinutes >= skill.weeklyMinutes ? 'leaf' : 'accent'} className="mt-1" />}
              </div>
              <div className="rounded-[12px] bg-inset px-3 py-2.5">
                <p className="eyebrow text-[11px]">Insgesamt</p>
                <p className="font-mono text-[20px] font-medium text-ink tabular">{formatMinutes(skill.totalMinutes)}</p>
                {skill.startedAt && <p className="text-[12px] text-ink-3">seit {format(new Date(skill.startedAt), 'd. MMM yyyy', { locale: de })}</p>}
              </div>
            </div>

            <form onSubmit={logSession} className="space-y-3 rounded-[12px] border border-line/10 p-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Minuten">
                {[15, 30, 45, 60, 90].map((m) => (
                  <button key={m} type="button" aria-pressed={minutes === String(m)} onClick={() => setMinutes(String(m))} className="tab h-8 border-line/15 px-3 text-[13px]">
                    {m} min
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input aria-label="Minuten" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} className="field-input h-10 py-0 pr-12 font-mono" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">min</span>
                </div>
                <input aria-label="Datum" type="date" value={sessionDate} max={toDateInput(new Date())} onChange={(e) => setSessionDate(e.target.value)} className="field-input h-10 py-0 font-mono text-[14px]" />
              </div>
              <input aria-label="Notiz" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Was hast du gemacht? (optional)" className="field-input h-10 py-0" />
              <button type="submit" disabled={busy} className="btn-primary w-full">
                Lernzeit eintragen
              </button>
            </form>

            {skill.sessions.length > 0 && (
              <ul className="mt-4 divide-y divide-line/10">
                {skill.sessions.slice(0, 20).map((s) => (
                  <li key={s.id} className="group flex items-center gap-3 py-2 text-[14px]">
                    <span className="w-24 flex-shrink-0 text-ink-3">{format(new Date(s.date), 'EEE d. MMM', { locale: de })}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-2">{s.note || '–'}</span>
                    <span className="font-mono text-ink tabular">{s.minutes} min</span>
                    <button type="button" onClick={() => call(`/sessions/${s.id}`, 'DELETE')} className="icon-btn h-8 w-8 hover:text-pen sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label="Eintrag löschen">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {section === 'about' && (
          <div className="space-y-4">
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <div>
                <label htmlFor="skill-emoji" className="field-label">
                  Icon
                </label>
                <input id="skill-emoji" value={emoji} maxLength={8} onChange={(e) => setEmoji(e.target.value)} className="field-input text-center text-[22px]" />
              </div>
              <div>
                <label htmlFor="skill-name" className="field-label">
                  Titel
                </label>
                <input id="skill-name" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} className="field-input" />
              </div>
            </div>
            <div>
              <label htmlFor="skill-why" className="field-label">
                Warum willst du das lernen?
              </label>
              <textarea id="skill-why" rows={2} value={why} maxLength={500} onChange={(e) => setWhy(e.target.value)} placeholder="Motiviert dich, wenn's zäh wird" className="field-input resize-y" />
            </div>
            <div>
              <span className="field-label">Kategorie</span>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_CATEGORIES.map((c) => (
                  <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className="tab h-8 border-line/15 px-3 text-[13px]">
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="field-label">Wochenziel</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKLY_GOALS.map((m) => (
                  <button key={m} type="button" aria-pressed={weekly === m} onClick={() => setWeekly(m)} className="tab h-8 border-line/15 px-3 text-[13px]">
                    {m === 0 ? 'Keins' : formatMinutes(m)}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-w-[220px]">
              <label htmlFor="skill-target" className="field-label">
                Können bis <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input id="skill-target" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="field-input font-mono text-[14px]" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
