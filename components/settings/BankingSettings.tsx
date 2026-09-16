'use client';

import React, { useEffect, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, Copy, ExternalLink, Landmark, Search } from 'lucide-react';
import type { DashboardSummary } from '@/types';
import { api, errorMessage } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';

interface BankingConfig {
  appId: string | null;
  hasPrivateKey: boolean;
  redirectUrl: string | null;
  defaultRedirectUrl: string;
  fromEnvironment: boolean;
}

interface Bank {
  name: string;
  country: string;
  beta: boolean;
  maxConsentDays: number | null;
}

interface BankingSettingsProps {
  banking: DashboardSummary['banking'];
  onChanged: () => void;
}

const STATUS_LABELS: Record<string, string> = { active: 'verbunden', expired: 'abgelaufen', error: 'Fehler', pending: 'wartet' };

export const BankingSettings: React.FC<BankingSettingsProps> = ({ banking, onChanged }) => {
  const toast = useToast();
  const [config, setConfig] = useState<BankingConfig | null>(null);
  const [appId, setAppId] = useState('');
  const [keyText, setKeyText] = useState('');
  const [keyName, setKeyName] = useState('');
  const [redirect, setRedirect] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [country, setCountry] = useState('AT');
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [connecting, setConnecting] = useState(false);

  const configured = banking.configured || !!(config?.appId && config.hasPrivateKey);

  useEffect(() => {
    api<BankingConfig>('/api/v1/banking/config')
      .then((c) => {
        setConfig(c);
        setAppId(c.appId ?? '');
        setRedirect(c.redirectUrl ?? '');
      })
      .catch((e) => toast(`Bank-Einstellungen konnten nicht geladen werden: ${errorMessage(e)}`, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!configured) return;
    setBanks(null);
    setBankError(null);
    api<Bank[]>(`/api/v1/banking/aspsps?country=${country}`)
      .then(setBanks)
      .catch((e) => setBankError(errorMessage(e)));
  }, [configured, country]);

  const redirectUrl = redirect || config?.defaultRedirectUrl || '';

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Kopieren nicht möglich – bitte manuell markieren', 'info');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api<BankingConfig>('/api/v1/banking/config', {
        body: { appId: appId.trim(), redirectUrl: redirect.trim(), ...(keyText && { privateKey: keyText }) },
      });
      setConfig(saved);
      setKeyText('');
      setKeyName('');
      toast('Enable Banking gespeichert');
      onChanged();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const connect = async () => {
    if (!selectedBank) return;
    setConnecting(true);
    try {
      const { url } = await api<{ url: string }>('/api/v1/banking/connect', { body: { aspspName: selectedBank, country } });
      window.location.href = url;
    } catch (e) {
      toast(errorMessage(e), 'error');
      setConnecting(false);
    }
  };

  const disconnect = async (id: string, name: string) => {
    if (!window.confirm(`Verbindung zu ${name} trennen? Bisher abgerufene Umsätze bleiben erhalten.`)) return;
    try {
      await api(`/api/v1/banking/connections/${id}`, { method: 'DELETE' });
      toast('Verbindung getrennt');
      onChanged();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const filtered = (banks ?? []).filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 60);

  return (
    <div className="space-y-8">
      <section>
        <h4 className="font-display text-[20px] font-semibold text-ink">George automatisch abrufen</h4>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
          Banken geben Umsätze nur über lizenzierte Dienste heraus. LifeTracker nutzt dafür <strong>Enable Banking</strong> – für private
          Nutzung deiner eigenen Konten kostenlos. Einmalig einrichten:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-ink-2 marker:font-bold marker:text-ink">
          <li>
            Auf{' '}
            <a href="https://enablebanking.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-accent underline">
              enablebanking.com <ExternalLink className="inline h-3 w-3" />
            </a>{' '}
            registrieren und im Control Panel unter „API applications“ eine App anlegen.
          </li>
          <li>
            Als Environment <strong>Production</strong> wählen und diese Redirect-URL eintragen:
            <span className="mt-1.5 flex gap-2">
              <input readOnly value={redirectUrl} onFocus={(e) => e.target.select()} className="field-input h-9 py-0 font-mono text-[12px]" aria-label="Redirect-URL" />
              <button type="button" onClick={copyRedirect} className="btn-secondary h-9 px-3">
                {copied ? <Check className="h-4 w-4 text-leaf" /> : <Copy className="h-4 w-4" />}
              </button>
            </span>
          </li>
          <li>Den Schlüssel im Browser erzeugen lassen – du bekommst eine .pem-Datei und eine App-ID.</li>
          <li>Bei der App „Activate by linking accounts“ wählen und dein George-Konto verknüpfen (Freigabe in der s Identity App).</li>
          <li>App-ID und .pem-Datei unten speichern, dann deine Bank verbinden.</li>
        </ol>
      </section>

      <section className="space-y-4 rounded-[12px] border border-line/10 bg-inset p-4">
        {config?.fromEnvironment && <p className="text-[13px] text-ink-3">Zugangsdaten kommen aus den Umgebungsvariablen des Servers.</p>}
        <div>
          <label htmlFor="eb-app-id" className="field-label">
            App-ID
          </label>
          <input
            id="eb-app-id"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="field-input bg-sheet font-mono text-[13px]"
            autoCapitalize="off"
          />
        </div>
        <div>
          <span className="field-label">Schlüssel (.pem)</span>
          <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-dashed border-line/25 bg-sheet px-3 py-2.5 hover:border-accent/60">
            <span className="btn-secondary h-8 px-3 text-[13px]">Datei wählen</span>
            <span className="truncate text-[13px] text-ink-2">
              {keyName || (config?.hasPrivateKey ? 'Schlüssel ist gespeichert' : 'noch kein Schlüssel')}
            </span>
            <input
              type="file"
              accept=".pem,.key,.txt"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setKeyText(await file.text());
                setKeyName(file.name);
              }}
            />
          </label>
        </div>
        <details>
          <summary className="cursor-pointer text-[13px] font-bold text-ink-2">Andere Redirect-URL verwenden</summary>
          <input
            value={redirect}
            onChange={(e) => setRedirect(e.target.value)}
            placeholder={config?.defaultRedirectUrl}
            className="field-input mt-2 bg-sheet font-mono text-[12px]"
            aria-label="Eigene Redirect-URL"
          />
          <p className="mt-1.5 text-[12px] text-ink-3">
            Falls Enable Banking eine http://-Adresse ablehnt: die https-Adresse eintragen, unter der LifeTracker erreichbar ist.
          </p>
        </details>
        <button type="button" onClick={save} disabled={saving || !appId.trim()} className="btn-primary">
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
      </section>

      {configured && (
        <section>
          <h4 className="font-display text-[20px] font-semibold text-ink">Bank verbinden</h4>
          <div className="mt-3 flex gap-2">
            <div className="segmented w-[120px] grid-cols-2" role="group" aria-label="Land">
              {['AT', 'DE'].map((c) => (
                <button key={c} type="button" aria-pressed={country === c} onClick={() => setCountry(c)} className="segmented-item min-h-[34px]">
                  {c}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="z. B. Erste Bank" className="field-input h-[46px] py-0 pl-9" aria-label="Bank suchen" />
            </div>
          </div>
          {bankError && <p className="mt-2 text-[13px] font-bold text-pen">{bankError}</p>}
          {!banks && !bankError && <p className="mt-3 text-[14px] text-ink-3">Lädt Banken…</p>}
          {banks && (
            <ul className="mt-3 max-h-64 divide-y divide-line/10 overflow-y-auto rounded-[10px] border border-line/10" role="listbox" aria-label="Banken">
              {filtered.map((bank) => (
                <li key={bank.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedBank === bank.name}
                    onClick={() => setSelectedBank(bank.name)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[14px] ${
                      selectedBank === bank.name ? 'bg-ink text-sheet' : 'text-ink hover:bg-inset'
                    }`}
                  >
                    <span className="font-bold">{bank.name}</span>
                    {bank.maxConsentDays && <span className="text-[12px] opacity-70">Freigabe {bank.maxConsentDays} Tage</span>}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="px-3 py-4 text-[14px] text-ink-3">Keine Bank gefunden.</li>}
            </ul>
          )}
          <button type="button" onClick={connect} disabled={!selectedBank || connecting} className="btn-primary mt-3">
            <Landmark className="h-4 w-4" /> {connecting ? 'Leitet weiter…' : selectedBank ? `Mit ${selectedBank} verbinden` : 'Bank auswählen'}
          </button>
        </section>
      )}

      {banking.connections.length > 0 && (
        <section>
          <h4 className="font-display text-[20px] font-semibold text-ink">Verbindungen</h4>
          <ul className="mt-2 divide-y divide-line/10">
            {banking.connections.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-ink">{c.aspspName}</span>
                  <span className="block text-[13px] text-ink-3">
                    <span className={c.status === 'active' ? 'text-leaf' : 'text-pen'}>{STATUS_LABELS[c.status] ?? c.status}</span>
                    {c.validUntil && ` · gültig bis ${format(new Date(c.validUntil), 'd. MMM yyyy', { locale: de })}`}
                    {c.lastSyncAt && ` · abgerufen ${formatDistanceToNow(new Date(c.lastSyncAt), { addSuffix: true, locale: de })}`}
                  </span>
                </span>
                <button type="button" onClick={() => disconnect(c.id, c.aspspName)} className="btn-danger h-8 px-3 text-[13px]">
                  Trennen
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
