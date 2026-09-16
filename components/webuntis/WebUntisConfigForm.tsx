'use client';

import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import type { WebUntisConfig } from '@/types';
import { api, errorMessage } from '@/lib/client';
import { fireMilestoneGlow } from '@/lib/confetti';
import { DEMO_DEFAULTS, DEMO_SCHOOL } from '@/lib/untis-defaults';

interface WebUntisConfigFormProps {
  config: WebUntisConfig | null;
  onSynced: (message: string) => void;
}

type Status = { kind: 'success' | 'error' | 'info'; message: string } | null;

const initialForm = (config: WebUntisConfig | null) => ({
  schoolName: config?.schoolName ?? DEMO_DEFAULTS.schoolName,
  server: config?.server ?? DEMO_DEFAULTS.server,
  school: config?.school ?? DEMO_DEFAULTS.school,
  username: config?.username ?? DEMO_DEFAULTS.username,
  icalUrl: config?.icalUrl ?? '',
  timetableScope: config?.timetableScope ?? 'personal',
});

const STATUS_STYLE = {
  success: { className: 'border-leaf/30 bg-leaf/10', Icon: CheckCircle2, iconClass: 'text-leaf' },
  error: { className: 'border-pen/30 bg-pen/10', Icon: AlertCircle, iconClass: 'text-pen' },
  info: { className: 'border-line/15 bg-inset', Icon: Info, iconClass: 'text-accent' },
};

export const WebUntisConfigForm: React.FC<WebUntisConfigFormProps> = ({ config, onSynced }) => {
  const [form, setForm] = useState(() => initialForm(config));
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(!!config?.hasPassword);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<'test' | 'sync' | 'clear' | null>(null);

  useEffect(() => {
    setForm(initialForm(config));
    setHasPassword(!!config?.hasPassword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, config?.lastSyncAt, config?.timetableScope]);

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
