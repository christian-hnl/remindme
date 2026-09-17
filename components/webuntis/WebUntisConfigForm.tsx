'use client';

import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertCircle, CheckCircle2, Info, RefreshCw, Repeat, Split, Users, X } from 'lucide-react';
import type { WebUntisConfig } from '@/types';
import { api, errorMessage } from '@/lib/client';
import { toDateInput } from '@/lib/format';
import { fireMilestoneGlow } from '@/lib/confetti';
import { DEMO_DEFAULTS, DEMO_SCHOOL } from '@/lib/untis-defaults';

interface WebUntisConfigFormProps {
  config: WebUntisConfig | null;
  onSynced: (message: string) => void;
  onGroupsChanged: () => void;
}

type Status = { kind: 'success' | 'error' | 'info'; message: string } | null;

const DAY_NAMES: Record<number, string> = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So' };

type Slot = NonNullable<WebUntisConfig['parallelSlots']>[number];
type Rotation = WebUntisConfig['rotatingLessons'][number];

const initialForm = (config: WebUntisConfig | null) => ({
  schoolName: config?.schoolName ?? '',
  server: config?.server ?? '',
  school: config?.school ?? '',
  username: config?.username ?? '',
  icalUrl: config?.icalUrl ?? '',
  timetableScope: config?.timetableScope ?? 'personal',
});

const STATUS_STYLE = {
  success: { className: 'border-leaf/30 bg-leaf/10', Icon: CheckCircle2, iconClass: 'text-leaf' },
  error: { className: 'border-pen/30 bg-pen/10', Icon: AlertCircle, iconClass: 'text-pen' },
  info: { className: 'border-line/15 bg-inset', Icon: Info, iconClass: 'text-accent' },
};

export const WebUntisConfigForm: React.FC<WebUntisConfigFormProps> = ({ config, onSynced, onGroupsChanged }) => {
  const [form, setForm] = useState(() => initialForm(config));
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(!!config?.hasPassword);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<'test' | 'sync' | 'clear' | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(config?.selectedGroups ?? []);
  const [hiddenLessons, setHiddenLessons] = useState<string[]>(config?.hiddenLessons ?? []);
  const [rotatingLessons, setRotatingLessons] = useState<Rotation[]>(config?.rotatingLessons ?? []);
  const [savingGroups, setSavingGroups] = useState(false);

  useEffect(() => {
    setForm(initialForm(config));
    setHasPassword(!!config?.hasPassword);
    setSelectedGroups(config?.selectedGroups ?? []);
    setHiddenLessons(config?.hiddenLessons ?? []);
    setRotatingLessons(config?.rotatingLessons ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, config?.lastSyncAt, config?.timetableScope]);

  /**
   * Tags of parallel lessons in the synced timetable (unfiltered, so both groups stay pickable).
   * Untis usually labels split groups itself ("sg"); without that the sync falls back to the
   * teacher or room, which still tells two parallel groups apart.
   */
  const groupTags = config?.availableGroups ?? [];

  const parallelSlots = config?.parallelSlots ?? [];

  const saveFilters = async (next: { selectedGroups?: string[]; hiddenLessons?: string[]; rotatingLessons?: Rotation[] }) => {
    const previous = { selectedGroups, hiddenLessons, rotatingLessons };
    if (next.selectedGroups) setSelectedGroups(next.selectedGroups);
    if (next.hiddenLessons) setHiddenLessons(next.hiddenLessons);
    if (next.rotatingLessons) setRotatingLessons(next.rotatingLessons);
    setSavingGroups(true);
    try {
      await api('/api/v1/webuntis/config', { body: next });
      onGroupsChanged();
    } catch (error) {
      setSelectedGroups(previous.selectedGroups);
      setHiddenLessons(previous.hiddenLessons);
      setRotatingLessons(previous.rotatingLessons);
      setStatus({ kind: 'error', message: errorMessage(error) });
    } finally {
      setSavingGroups(false);
    }
  };

  const toggleGroup = (tag: string) =>
    saveFilters({ selectedGroups: selectedGroups.includes(tag) ? selectedGroups.filter((g) => g !== tag) : [...selectedGroups, tag] });

  /** Group tag of a chosen lesson has to be selected too, or the group filter hides it again. */
  const groupsIncluding = (lesson?: Slot['lessons'][number]) =>
    lesson?.studentGroup && selectedGroups.length > 0 && !selectedGroups.includes(lesson.studentGroup)
      ? [...selectedGroups, lesson.studentGroup]
      : undefined;

  /** "Immer diese": one lesson of the slot is always the user's, the others are hidden. */
  const chooseMine = (slot: Slot, mineKey: string) => {
    const slotKeys = slot.lessons.map((l) => l.key);
    const groups = groupsIncluding(slot.lessons.find((l) => l.key === mineKey));
    saveFilters({
      hiddenLessons: [...hiddenLessons.filter((k) => !slotKeys.includes(k)), ...slotKeys.filter((k) => k !== mineKey)],
      rotatingLessons: rotatingLessons.filter((r) => !r.keys.some((k) => slotKeys.includes(k))),
      ...(groups ? { selectedGroups: groups } : {}),
    });
  };

  /** "Wechselt wöchentlich": thisWeekKey has the turn now, the others follow in order. */
  const chooseRotation = (slot: Slot, thisWeekKey: string) => {
    const slotKeys = slot.lessons.map((l) => l.key);
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() || 7) - 1));
    const groups = slot.lessons.map(groupsIncluding).find(Boolean);
    saveFilters({
      hiddenLessons: hiddenLessons.filter((k) => !slotKeys.includes(k)),
      rotatingLessons: [
        ...rotatingLessons.filter((r) => !r.keys.some((k) => slotKeys.includes(k))),
        { keys: slotKeys, anchorMonday: toDateInput(monday), anchorKey: thisWeekKey },
      ],
      ...(groups ? { selectedGroups: groups } : {}),
    });
  };

  const keepAll = (slot: Slot) => {
    const slotKeys = slot.lessons.map((l) => l.key);
    saveFilters({
      hiddenLessons: hiddenLessons.filter((k) => !slotKeys.includes(k)),
      rotatingLessons: rotatingLessons.filter((r) => !r.keys.some((k) => slotKeys.includes(k))),
    });
  };

  const rotationOf = (slot: Slot) => rotatingLessons.find((r) => r.keys.some((k) => slot.lessons.some((l) => l.key === k)));

  const set = (key: 'schoolName' | 'server' | 'school' | 'username' | 'icalUrl') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const isDemo = form.school.trim() === DEMO_SCHOOL;

  const save = async () => {
    const saved = await api<WebUntisConfig>('/api/v1/webuntis/config', {
      body: { ...form, icalUrl: form.icalUrl.trim(), password: password || undefined },
    });
    setHasPassword(saved.hasPassword);
    setPassword('');
    return saved;
  };

  const handleTest = async () => {
    setBusy('test');
    setStatus(null);
    try {
      const result = await api<{ success: boolean; message: string }>('/api/v1/webuntis/test', { body: { ...form, password } });
      setStatus({ kind: result.success ? 'success' : 'error', message: result.message });
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async () => {
    setBusy('sync');
    setStatus({ kind: 'info', message: 'Speichert und lädt deinen Stundenplan…' });
    try {
      await save();
      const result = await api<{ message: string }>('/api/v1/webuntis/sync', { method: 'POST' });
      setStatus({ kind: 'success', message: result.message });
      fireMilestoneGlow();
      onSynced(result.message);
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handleClearPassword = async () => {
    setBusy('clear');
    try {
      await api('/api/v1/webuntis/config', { body: { clearPassword: true } });
      setHasPassword(false);
      setStatus({ kind: 'info', message: 'Gespeichertes Passwort entfernt.' });
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const lastSync = config?.lastSyncAt ? formatDistanceToNow(new Date(config.lastSyncAt), { addSuffix: true, locale: de }) : null;
  const statusStyle = status ? STATUS_STYLE[status.kind] : null;

  return (
    <div className="space-y-5">
      <p className="rounded-[10px] bg-inset p-3 text-[14px] leading-relaxed text-ink-2">
        Server und Schulkürzel stehen in der Adresse, mit der du WebUntis im Browser öffnest:
        <span className="mt-1 block break-all font-mono text-[12px] text-ink">
          https://<b className="marker">server</b>/WebUntis/?school=<b className="marker">kürzel</b>
        </span>
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="untis-server" className="field-label">
            Server
          </label>
          <input id="untis-server" value={form.server} onChange={set('server')} placeholder="xyz.webuntis.com" className="field-input font-mono text-[14px]" autoCapitalize="off" />
        </div>
        <div>
          <label htmlFor="untis-school" className="field-label">
            Schulkürzel
          </label>
          <input id="untis-school" value={form.school} onChange={set('school')} placeholder="htl-musterstadt" className="field-input font-mono text-[14px]" autoCapitalize="off" />
        </div>
        <div>
          <label htmlFor="untis-user" className="field-label">
            Benutzername
          </label>
          <input id="untis-user" value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="off" className="field-input" />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="untis-password" className="field-label">
              Passwort
            </label>
            {hasPassword && (
              <button type="button" onClick={handleClearPassword} disabled={busy !== null} className="text-[12px] font-bold text-pen hover:underline">
                entfernen
              </button>
            )}
          </div>
          <input
            id="untis-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder={hasPassword ? 'gespeichert' : isDemo ? 'für Demo nicht nötig' : ''}
            className="field-input"
          />
        </div>

        <div className="sm:col-span-2">
          <span className="field-label">Welcher Stundenplan?</span>
          <div className="segmented grid-cols-2" role="group" aria-label="Stundenplan">
            <button
              type="button"
              aria-pressed={form.timetableScope === 'personal'}
              onClick={() => setForm((f) => ({ ...f, timetableScope: 'personal' }))}
              className="segmented-item"
            >
              Mein Stundenplan
            </button>
            <button
              type="button"
              aria-pressed={form.timetableScope === 'class'}
              onClick={() => setForm((f) => ({ ...f, timetableScope: 'class' }))}
              className="segmented-item"
            >
              Ganze Klasse
            </button>
          </div>
          <p className="mt-1.5 text-[13px] text-ink-3">
            {form.timetableScope === 'personal'
              ? 'Nur die Stunden, die dir in WebUntis zugewiesen sind. Ist nichts zugewiesen, wird der Klassenplan geladen.'
              : 'Alle Stunden deiner Klasse, parallele Gruppen stehen nebeneinander.'}
          </p>
        </div>

        {groupTags.length > 0 && (
          <div className="sm:col-span-2">
            <span className="field-label flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Deine Gruppe & dein Schwerpunkt
            </span>
            <p className="mb-2 text-[13px] leading-relaxed text-ink-3">
              In deinem Plan laufen Stunden parallel – Gruppe 1 und 2, Religion/Ethik und die Schwerpunkte. Wähl <b>alles</b> aus, was zu dir gehört (also z. B. deine Gruppe
              <i>und</i> dein Religionsfach). Der Rest verschwindet aus Stundenplan und Tagesansicht.
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Deine Gruppen">
              {groupTags.map(({ tag, count, subjects }) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selectedGroups.includes(tag)}
                  disabled={savingGroups}
                  onClick={() => toggleGroup(tag)}
                  title={`${subjects.join(', ')} · ${count} Stunden`}
                  className="tab h-auto flex-col items-start gap-0 border-line/15 py-1.5"
                >
                  <span>{subjects.slice(0, 2).join(', ')}</span>
                  <span className="font-mono text-[10px] font-medium opacity-70">
                    {tag} · {count} Std.
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-ink-3">
              {selectedGroups.length === 0 ? (
                'Nichts gewählt – es werden alle Gruppen angezeigt.'
              ) : (
                <button
                  type="button"
                  onClick={() => saveFilters({ selectedGroups: [] })}
                  disabled={savingGroups}
                  className="inline-flex items-center gap-1 font-bold text-ink-2 hover:underline"
                >
                  <X className="h-3.5 w-3.5" /> Wieder alle Gruppen anzeigen
                </button>
              )}
            </p>
          </div>
        )}

        {parallelSlots.length > 0 && (
          <div className="sm:col-span-2">
            <span className="field-label flex items-center gap-1.5">
              <Split className="h-3.5 w-3.5" /> Welche Stunde hast du?
            </span>
            <p className="mb-3 text-[13px] leading-relaxed text-ink-3">
              Hier laufen zwei oder mehr Stunden gleichzeitig. Bei der Hälfte davon verrät WebUntis nicht, wer welche hat – tipp einfach deine an, der Rest wird ausgeblendet.
            </p>
            <ul className="space-y-2">
              {parallelSlots.map((slot) => {
                const rotation = rotationOf(slot);
                const visible = slot.lessons.filter((l) => !l.hidden);
                const fixed = !rotation && visible.length === 1;
                return (
                  <li key={`${slot.day}-${slot.startTime}`} className="rounded-[10px] border border-line/10 p-2.5">
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-[12px] text-ink-2 tabular">
                        {DAY_NAMES[slot.day] ?? ''} {slot.startTime}–{slot.endTime}
                      </span>
                      <span className="flex items-center gap-2 text-[12px]">
                        {rotation ? (
                          <span className="flex items-center gap-1 font-bold text-accent">
                            <Repeat className="h-3.5 w-3.5" /> wechselt wöchentlich
                          </span>
                        ) : fixed ? (
                          <span className="font-bold text-leaf">festgelegt</span>
                        ) : (
                          <span className="text-ink-3">noch offen</span>
                        )}
                        {(rotation || fixed) && (
                          <button type="button" onClick={() => keepAll(slot)} disabled={savingGroups} className="font-bold text-ink-3 hover:underline">
                            zurücksetzen
                          </button>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {slot.lessons.map((lesson) => (
                        <button
                          key={lesson.key}
                          type="button"
                          aria-pressed={!lesson.hidden && (fixed || !!rotation)}
                          disabled={savingGroups}
                          onClick={() => (rotation ? chooseRotation(slot, lesson.key) : chooseMine(slot, lesson.key))}
                          title={[lesson.subjectName, lesson.teacher, lesson.room, lesson.studentGroup].filter(Boolean).join(' · ')}
                          className={`tab h-auto flex-col items-start gap-0 border-line/15 py-1.5 ${lesson.hidden ? 'opacity-45' : ''}`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: lesson.colorHex }} />
                            {lesson.subjectCode || lesson.subjectName}
                            {rotation && !lesson.hidden && <span className="font-mono text-[10px] text-accent">diese Woche</span>}
                          </span>
                          <span className="max-w-[160px] truncate font-mono text-[10px] font-medium opacity-70">
                            {[lesson.teacher, lesson.room].filter(Boolean).join(' · ') || lesson.subjectName}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[12px] text-ink-3">
                      {rotation ? (
                        <>Tipp die Stunde an, die <b>diese Woche</b> dran ist – danach wechselt sie automatisch jede Woche weiter.</>
                      ) : (
                        <>
                          Tipp deine Stunde an ={'>'} immer diese.{' '}
                          <button
                            type="button"
                            onClick={() => chooseRotation(slot, visible[0]?.key ?? slot.lessons[0].key)}
                            disabled={savingGroups}
                            className="font-bold text-accent hover:underline"
                          >
                            Oder: wechselt wöchentlich
                          </button>
                        </>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="sm:col-span-2">
          <label htmlFor="untis-school-name" className="field-label">
            Name der Schule <span className="normal-case tracking-normal">(nur Anzeige)</span>
          </label>
          <input id="untis-school-name" value={form.schoolName} onChange={set('schoolName')} className="field-input" />
        </div>
        <details className="sm:col-span-2">
          <summary className="cursor-pointer list-none text-[14px] font-bold text-accent hover:underline">Ohne Passwort? iCal-Link verwenden</summary>
          <div className="mt-3">
            <label htmlFor="untis-ical" className="field-label">
              iCal-Link
            </label>
            <input id="untis-ical" type="url" value={form.icalUrl} onChange={set('icalUrl')} placeholder="https://…" className="field-input font-mono text-[13px]" />
            <p className="mt-1.5 text-[13px] text-ink-3">In WebUntis unter Profil → Freigaben → Stundenplan abonnieren.</p>
          </div>
        </details>
      </div>

      {status && statusStyle && (
        <p role="status" className={`flex items-start gap-2 rounded-[10px] border p-3 text-[14px] text-ink ${statusStyle.className}`}>
          <statusStyle.Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${statusStyle.iconClass}`} />
          <span>{status.message}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/10 pt-4">
        <div className="text-[13px] text-ink-3">
          {lastSync ? `Zuletzt ${lastSync}` : 'Noch nie synchronisiert'} ·{' '}
          <button type="button" onClick={() => setForm({ ...DEMO_DEFAULTS, icalUrl: '', timetableScope: 'personal' })} className="font-bold text-ink-2 hover:underline">
            Demo laden
          </button>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button type="button" onClick={handleTest} disabled={busy !== null} className="btn-secondary flex-1 sm:flex-none">
            {busy === 'test' ? 'Testet…' : 'Testen'}
          </button>
          <button type="button" onClick={handleSync} disabled={busy !== null} className="btn-primary flex-1 sm:flex-none">
            <RefreshCw className={`h-4 w-4 ${busy === 'sync' ? 'animate-spin' : ''}`} />
            {busy === 'sync' ? 'Lädt…' : 'Speichern & laden'}
          </button>
        </div>
      </div>
    </div>
  );
};
