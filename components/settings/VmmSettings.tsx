'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, LinkIcon, Mail, RefreshCw, Unlink } from 'lucide-react';
import type { VmmConfig } from '@/types';
import { api, errorMessage } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface VmmSettingsProps {
  config: VmmConfig | null;
  onChanged: (config: VmmConfig | null) => void;
}

/**
 * View My Marks has no password: you request a mail, open the link inside it, and that
 * makes a session. Since the link opens in the browser, the user pastes it back here.
 */
export function VmmSettings({ config, onChanged }: VmmSettingsProps) {
  const toast = useToast();
  const [email, setEmail] = useState(config?.email ?? '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState<'mail' | 'connect' | 'sync' | 'forget' | null>(null);
  const [mailSent, setMailSent] = useState(false);

  useEffect(() => {
    setEmail((current) => current || config?.email || '');
  }, [config?.email]);

  const post = async (action: 'mail' | 'connect' | 'sync', extra: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const result = await api<{ message?: string; config?: VmmConfig }>('/api/v1/vmm', { body: { action, email, ...extra } });
      if (result.config) onChanged(result.config);
      if (result.message) toast(result.message);
      return true;
    } catch (e) {
      toast(errorMessage(e), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const forget = async () => {
    setBusy('forget');
    try {
      await api('/api/v1/vmm', { method: 'DELETE' });
      onChanged(config ? { ...config, isConnected: false, username: null } : null);
      setMailSent(false);
      toast('Verbindung getrennt – die geladenen Noten bleiben.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const connected = !!config?.isConnected;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[14px] leading-relaxed text-ink-2">
          View My Marks (vmm.htlstp.ac.at) schickt dir einen Login-Link per E-Mail. Der Link wird hier einmal eingelöst, danach holt LifeTracker deine Noten
          selbst. Die Sitzung bleibt am Server – im Browser landet sie nie.
        </p>
      </div>

      {connected && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-leaf/10 p-4">
          <p className="flex items-center gap-2 text-[14px] font-bold text-leaf">
            <CheckCircle2 className="h-4 w-4" />
            Verbunden{config?.username ? ` als ${config.username}` : ''}
          </p>
          <span className="text-[13px] text-ink-2">
            {config?.lastSyncAt ? `Zuletzt: ${format(new Date(config.lastSyncAt), 'd. MMM, HH:mm', { locale: de })}` : 'Noch nicht abgerufen'}
            {config?.groups?.length ? ` · ${config.groups.length} Fächer` : ''}
          </span>
        </div>
      )}

      {config?.lastError && !connected && <p className="rounded-[10px] bg-pen/10 p-3 text-[13px] text-pen">{config.lastError}</p>}

      <div>
        <label htmlFor="vmm-email" className="field-label">
          Schul-E-Mail
        </label>
        <input
          id="vmm-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="20230204@htlstp.at"
          className="field-input"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            if (await post('mail')) setMailSent(true);
          }}
          disabled={busy !== null || !email.includes('@')}
          className="btn-secondary"
        >
          <Mail className={`h-4 w-4 ${busy === 'mail' ? 'animate-pulse' : ''}`} />
          {connected ? 'Neuen Link anfordern' : 'Login-Link anfordern'}
        </button>
        {connected && (
          <>
            <button type="button" onClick={() => post('sync')} disabled={busy !== null} className="btn-primary">
              <RefreshCw className={`h-4 w-4 ${busy === 'sync' ? 'animate-spin' : ''}`} /> Noten abrufen
            </button>
            <button type="button" onClick={forget} disabled={busy !== null} className="btn-ghost text-pen">
              <Unlink className="h-4 w-4" /> Trennen
            </button>
          </>
        )}
      </div>

      {(mailSent || !connected) && (
        <div className="rounded-[10px] bg-inset p-4">
          <label htmlFor="vmm-token" className="field-label">
            Link aus der E-Mail einfügen
          </label>
          <p className="mb-2 text-[13px] text-ink-3">Rechtsklick auf den Button in der Mail → Link kopieren. Der ganze Link darf hier rein.</p>
          <div className="flex flex-wrap gap-2">
            <input
              id="vmm-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="https://vmm.htlstp.ac.at/login?token=…"
              className="field-input min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={async () => {
                if (await post('connect', { token })) setToken('');
              }}
              disabled={busy !== null || token.trim().length < 10}
              className="btn-primary"
            >
              <LinkIcon className={`h-4 w-4 ${busy === 'connect' ? 'animate-pulse' : ''}`} /> Verbinden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
