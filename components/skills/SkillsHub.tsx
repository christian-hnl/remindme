'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { differenceInCalendarDays, format, startOfDay, startOfWeek, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronDown, Flame, Play, Plus, Rocket, Trophy } from 'lucide-react';
import type { Skill } from '@/types';
import { api, errorMessage } from '@/lib/client';
import { SKILL_IDEAS, formatMinutes, guessSkillMeta } from '@/lib/skills';
import { useToast } from '@/components/ui/Toast';
import { CheckButton } from '@/components/ui/CheckButton';
import { Progress } from '@/components/wealth/charts';
import { fireMilestoneGlow } from '@/lib/confetti';
import { SkillDetailModal } from './SkillDetailModal';

interface SkillsHubProps {
  skills: Skill[];
  onSkillsChange: (update: (skills: Skill[]) => Skill[]) => void;
  createRequest: boolean;
  onCreateRequestHandled: () => void;
}

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

export function minutesSince(skill: Skill, from: Date) {
  return skill.sessions.filter((s) => new Date(s.date) >= from).reduce((sum, s) => sum + s.minutes, 0);
}

function lastPracticed(skill: Skill) {
  const last = skill.sessions[0];
  if (!last) return 'noch nicht geübt';
  const days = differenceInCalendarDays(new Date(), new Date(last.date));
  return days === 0 ? 'heute geübt' : days === 1 ? 'gestern geübt' : `vor ${days} Tagen geübt`;
}

export function SkillsHub({ skills, onSkillsChange, createRequest, onCreateRequestHandled }: SkillsHubProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [startNow, setStartNow] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (!createRequest) return;
    inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    inputRef.current?.focus();
    onCreateRequestHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRequest]);

  const replace = (skill: Skill) => onSkillsChange((list) => list.map((s) => (s.id === skill.id ? skill : s)));

  const run = async (request: () => Promise<Skill>, success?: (skill: Skill) => string) => {
    try {
      const skill = await request();
      replace(skill);
      if (success) toast(success(skill));
      return skill;
    } catch (error) {
      toast(errorMessage(error), 'error');
      throw error;
    }
  };

  const create = async (value: string, status: 'idea' | 'active') => {
    const clean = value.trim();
    if (!clean) return;
    setAdding(true);
    try {
      const skill = await api<Skill>('/api/v1/skills', { body: { title: clean, status } });
      onSkillsChange((list) => [...list, skill]);
      setTitle('');
      toast(status === 'active' ? `Los geht's: ${skill.emoji} ${skill.title}` : `${skill.emoji} „${skill.title}“ auf die Wunschliste`);
      if (status === 'active') setOpenId(skill.id);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setAdding(false);
    }
  };

  const setStatus = (skill: Skill, status: Skill['status']) =>
    run(
      () => api<Skill>(`/api/v1/skills/${skill.id}`, { method: 'PATCH', body: { status } }),
      (s) => (status === 'active' ? `${s.emoji} ${s.title} gestartet` : status === 'done' ? `🎉 ${s.title} geschafft!` : 'Gespeichert')
    ).then(() => status === 'done' && fireMilestoneGlow());

  const logTime = (skill: Skill, minutes: number) =>
    run(
      () => api<Skill>(`/api/v1/skills/${skill.id}/sessions`, { body: { minutes } }),
      (s) => {
        const week = minutesSince(s, startOfWeek(new Date(), { weekStartsOn: 1 }));
        if (s.weeklyMinutes > 0 && week >= s.weeklyMinutes && week - minutes < s.weeklyMinutes) {
          fireMilestoneGlow();
          return `🎯 Wochenziel für ${s.title} erreicht!`;
        }
        return `+${minutes} min ${s.title}`;
      }
    ).catch(() => undefined);

  const toggleStep = (skill: Skill, stepId: string, isDone: boolean) => {
    replace({ ...skill, steps: skill.steps.map((st) => (st.id === stepId ? { ...st, isDone } : st)) });
    run(() => api<Skill>(`/api/v1/skills/${skill.id}/steps/${stepId}`, { method: 'PATCH', body: { isDone } })).catch(() => undefined);
    if (isDone) fireMilestoneGlow();
  };

  // ------------------------------------------------------------ stats
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const active = skills.filter((s) => s.status === 'active');
  const wishes = skills.filter((s) => s.status === 'idea' || s.status === 'paused');
  const done = skills.filter((s) => s.status === 'done');
  const weekMinutes = skills.reduce((sum, s) => sum + minutesSince(s, weekStart), 0);
  const weekGoal = active.reduce((sum, s) => sum + s.weeklyMinutes, 0);
  const totalMinutes = skills.reduce((sum, s) => sum + s.totalMinutes, 0);

  const perDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of skills) for (const session of s.sessions) {
      const key = dayKey(new Date(session.date));
      map.set(key, (map.get(key) ?? 0) + session.minutes);
    }
    return map;
  }, [skills]);

  let streak = 0;
  for (let d = perDay.has(dayKey(now)) ? now : subDays(now, 1); perDay.has(dayKey(d)); d = subDays(d, 1)) streak++;

  // 12 weeks, Monday first, ending with the current week.
  const heatStart = subDays(startOfWeek(now, { weekStartsOn: 1 }), 11 * 7);
  const heat = Array.from({ length: 12 * 7 }, (_, i) => {
    const d = subDays(heatStart, -i);
    return { key: dayKey(d), date: d, minutes: perDay.get(dayKey(d)) ?? 0, future: d > now };
  });
  const heatClass = (m: number) => (m === 0 ? 'bg-inset' : m < 20 ? 'bg-accent/30' : m < 45 ? 'bg-accent/50' : m < 90 ? 'bg-accent/80' : 'bg-accent');

  const guess = title.trim() ? guessSkillMeta(title) : null;
  const openSkill = skills.find((s) => s.id === openId) ?? null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <section className="card grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_auto]" aria-label="Lernstatistik">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="eyebrow text-[11px]">Diese Woche</p>
            <p className="mt-1 font-mono text-[24px] font-medium text-ink tabular">{formatMinutes(weekMinutes)}</p>
            {weekGoal > 0 ? (
              <>
                <Progress value={weekMinutes / weekGoal} tone={weekMinutes >= weekGoal ? 'leaf' : 'accent'} className="mt-1.5" />
                <p className="mt-1 text-[12px] text-ink-3">Ziel {formatMinutes(weekGoal)}</p>
              </>
            ) : (
              <p className="text-[12px] text-ink-3">kein Wochenziel</p>
            )}
          </div>
          <div>
            <p className="eyebrow text-[11px]">Serie</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[24px] font-medium text-ink tabular">
              <Flame className={`h-5 w-5 ${streak > 0 ? 'text-warn' : 'text-ink-3'}`} />
              {streak}
            </p>
            <p className="text-[12px] text-ink-3">{streak === 1 ? 'Tag' : 'Tage'} am Stück</p>
          </div>
          <div>
            <p className="eyebrow text-[11px]">Insgesamt</p>
            <p className="mt-1 font-mono text-[24px] font-medium text-ink tabular">{Math.round((totalMinutes / 60) * 10) / 10} h</p>
            <p className="text-[12px] text-ink-3">gelernt</p>
          </div>
          <div>
            <p className="eyebrow text-[11px]">Geschafft</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[24px] font-medium text-ink tabular">
              <Trophy className="h-5 w-5 text-marker" />
              {done.length}
            </p>
            <p className="text-[12px] text-ink-3">{active.length} aktiv · {wishes.length} Wünsche</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="eyebrow mb-2 text-[11px]">Letzte 12 Wochen</p>
          <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label="Lernzeit pro Tag in den letzten 12 Wochen">
            {heat.map((d) => (
              <span
                key={d.key}
                title={`${format(d.date, 'EEE d. MMM', { locale: de })}: ${d.minutes} min`}
                className={`h-3 w-3 rounded-[3px] sm:h-[14px] sm:w-[14px] ${d.future ? 'bg-transparent' : heatClass(d.minutes)}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Add */}
      <section className="card p-4 sm:p-5" aria-label="Neuer Skill">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create(title, startNow ? 'active' : 'idea');
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="skill-title" className="sr-only">
            Was willst du lernen?
          </label>
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px]" aria-hidden>
              {guess?.emoji ?? '✨'}
            </span>
            <input
              id="skill-title"
              ref={inputRef}
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Was willst du irgendwann können?"
              className="field-input h-12 pl-11 text-[16px]"
            />
          </div>
          <div className="flex gap-2">
            <div className="segmented grid-cols-2" role="group" aria-label="Wann">
              <button type="button" aria-pressed={!startNow} onClick={() => setStartNow(false)} className="segmented-item whitespace-nowrap px-3">
                Später
              </button>
              <button type="button" aria-pressed={startNow} onClick={() => setStartNow(true)} className="segmented-item whitespace-nowrap px-3">
                Jetzt starten
              </button>
            </div>
            <button type="submit" disabled={adding || !title.trim()} className="btn-primary h-12 flex-shrink-0">
              <Plus className="h-4 w-4" strokeWidth={2.5} /> <span className="hidden sm:inline">Hinzufügen</span>
            </button>
          </div>
        </form>
        {skills.length < 4 && (
          <div className="mt-3">
            <p className="text-[12px] font-bold text-ink-3">Ideen zum Antippen</p>
            <div className="scrollbar-none mt-1.5 flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap">
              {SKILL_IDEAS.filter((idea) => !skills.some((s) => s.title.toLowerCase() === idea.toLowerCase())).map((idea) => (
                <button key={idea} type="button" onClick={() => create(idea, 'idea')} disabled={adding} className="tab h-8 flex-shrink-0 border-line/15 px-3 text-[13px]">
                  {guessSkillMeta(idea).emoji} {idea}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-12 lg:items-start">
        {/* Active */}
        <section className="min-w-0 lg:col-span-8" aria-label="Lerne ich gerade">
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="card-title">Lerne ich gerade</h2>
            <span className="text-[13px] text-ink-3">{active.length} aktiv</span>
          </div>
          {active.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 border-dashed p-8 text-center">
              <Rocket className="h-6 w-6 text-accent" />
              <p className="font-bold text-ink">Noch nichts gestartet</p>
              <p className="max-w-sm text-[14px] text-ink-3">Such dir etwas von deiner Wunschliste aus und leg los – schon 15 Minuten pro Tag machen einen Unterschied.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {active.map((skill) => {
                const week = minutesSince(skill, weekStart);
                const stepsDone = skill.steps.filter((s) => s.isDone).length;
                const next = skill.steps.find((s) => !s.isDone);
                return (
                  <article key={skill.id} className="card flex flex-col p-4">
                    <button type="button" onClick={() => setOpenId(skill.id)} className="flex items-start gap-3 text-left">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[12px] bg-inset text-[26px]" aria-hidden>
                        {skill.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-bold text-ink">{skill.title}</span>
                        <span className="block truncate text-[12px] text-ink-3">
                          {skill.category} · {lastPracticed(skill)}
                        </span>
                      </span>
                    </button>

                    <div className="mt-4 space-y-3">
                      {skill.weeklyMinutes > 0 && (
                        <div>
                          <div className="mb-1 flex justify-between text-[12px]">
                            <span className="font-bold text-ink-2">Woche</span>
                            <span className="font-mono text-ink-3 tabular">
                              {week} / {skill.weeklyMinutes} min
                            </span>
                          </div>
                          <Progress value={week / skill.weeklyMinutes} tone={week >= skill.weeklyMinutes ? 'leaf' : 'accent'} />
                        </div>
                      )}
                      {skill.steps.length > 0 && (
                        <div>
                          <div className="mb-1 flex justify-between text-[12px]">
                            <span className="font-bold text-ink-2">Schritte</span>
                            <span className="font-mono text-ink-3 tabular">
                              {stepsDone} / {skill.steps.length}
                            </span>
                          </div>
                          <Progress value={stepsDone / skill.steps.length} tone="leaf" />
                        </div>
                      )}
                      {next ? (
                        <div className="flex items-center gap-2 rounded-[10px] bg-inset px-3 py-2">
                          <CheckButton checked={false} onChange={() => toggleStep(skill, next.id, true)} label={`${next.title} erledigt`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-3">Nächster Schritt</span>
                            <span className="block truncate text-[14px] text-ink">{next.title}</span>
                          </span>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setOpenId(skill.id)} className="w-full rounded-[10px] border border-dashed border-line/20 px-3 py-2 text-left text-[13px] text-ink-3 hover:text-ink">
                          {skill.steps.length > 0 ? '✓ Alle Schritte erledigt – nächste planen?' : '+ Plan in kleine Schritte zerlegen'}
                        </button>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-1.5">
                      {[15, 30, 60].map((m) => (
                        <button key={m} type="button" onClick={() => logTime(skill, m)} className="btn-secondary h-9 flex-1 px-2 text-[13px]">
                          +{m} min
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Wishes & done */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6 lg:col-span-4">
          <section className="card" aria-label="Wunschliste">
            <div className="p-4 pb-2 sm:p-5 sm:pb-2">
              <p className="eyebrow">Irgendwann</p>
              <h2 className="card-title mt-1">Wunschliste</h2>
            </div>
            {wishes.length === 0 ? (
              <p className="px-5 pb-5 pt-1 text-[14px] text-ink-3">Alles, was du „irgendwann mal“ lernen willst, kommt hierher.</p>
            ) : (
              <ul className="divide-y divide-line/10 px-4 pb-2 sm:px-5">
                {wishes.map((skill) => (
                  <li key={skill.id} className="flex items-center gap-3 py-2.5">
                    <button type="button" onClick={() => setOpenId(skill.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="text-[22px]" aria-hidden>
                        {skill.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-bold text-ink">{skill.title}</span>
                        <span className="block truncate text-[12px] text-ink-3">{skill.status === 'paused' ? 'pausiert' : skill.why || skill.category}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => setStatus(skill, 'active')} className="btn-secondary h-8 flex-shrink-0 px-2.5 text-[13px]">
                      <Play className="h-3.5 w-3.5" /> Start
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {done.length > 0 && (
            <section className="card" aria-label="Geschafft">
              <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="flex w-full items-center justify-between p-4 text-left sm:p-5">
                <span>
                  <span className="eyebrow block">Stolz drauf</span>
                  <span className="card-title mt-1 block">Geschafft ({done.length})</span>
                </span>
                <ChevronDown className={`h-5 w-5 text-ink-3 transition-transform ${showDone ? '' : '-rotate-90'}`} />
              </button>
              {showDone && (
                <ul className="divide-y divide-line/10 px-4 pb-3 sm:px-5">
                  {done.map((skill) => (
                    <li key={skill.id}>
                      <button type="button" onClick={() => setOpenId(skill.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
                        <span className="text-[22px]" aria-hidden>
                          {skill.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-bold text-ink">{skill.title}</span>
                          <span className="block text-[12px] text-ink-3">
                            {skill.finishedAt ? format(startOfDay(new Date(skill.finishedAt)), 'd. MMM yyyy', { locale: de }) : ''} · {formatMinutes(skill.totalMinutes)}
                          </span>
                        </span>
                        <Trophy className="h-4 w-4 text-marker" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <SkillDetailModal
        skill={openSkill}
        onClose={() => setOpenId(null)}
        onUpdated={replace}
        onDeleted={(id) => {
          onSkillsChange((list) => list.filter((s) => s.id !== id));
          setOpenId(null);
          toast('Gelöscht');
        }}
        onDone={() => fireMilestoneGlow()}
      />
    </div>
  );
}
