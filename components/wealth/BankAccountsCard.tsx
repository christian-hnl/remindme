'use client';

import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertTriangle, Eye, EyeOff, Landmark, RefreshCw, Trash2, Upload } from 'lucide-react';
import type { BankAccountSummary, BankConnectionSummary, DashboardSummary } from '@/types';
import { formatEuro } from '@/lib/format';

interface BankAccountsCardProps {
  banking: DashboardSummary['banking'];
  syncing: boolean;
  onSync: () => void;
  onImport: () => void;
  onOpenBankSettings: () => void;
  onReconnect: (connection: BankConnectionSummary) => void;
  onToggleInclude: (account: BankAccountSummary) => void;
  onDeleteAccount: (account: BankAccountSummary) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  enablebanking: 'automatisch',
  george: 'George-Import',
  traderepublic: 'Trade Republic',
  finanzguru: 'Finanzguru',
  file: 'Datei-Import',
};

const SOURCE_BADGE: Record<string, string> = {
  enablebanking: 'LIVE',
  george: 'G',
  traderepublic: 'TR',
  finanzguru: 'FG',
  file: 'CSV',
};

const maskIban = (iban?: string | null) => (iban ? `${iban.slice(0, 4)} ···· ${iban.slice(-4)}` : null);

export const BankAccountsCard: React.FC<BankAccountsCardProps> = ({
  banking,
  syncing,
  onSync,
  onImport,
  onOpenBankSettings,
  onReconnect,
  onToggleInclude,
  onDeleteAccount,
}) => {
  const liveConnections = banking.connections.filter((c) => c.status === 'active' || c.status === 'error');
  const problems = banking.connections.filter((c) => c.status === 'expired' || c.status === 'error');

  return (
    <section className="card" aria-label="Konten">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
        <div>
          <p className="eyebrow">Konten</p>
          <h2 className="card-title mt-1">Banken & Importe</h2>
        </div>
        <div className="flex gap-2">
          {liveConnections.length > 0 && (
            <button type="button" onClick={onSync} disabled={syncing} className="btn-secondary h-9 px-3">
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Ruft ab…' : 'Abrufen'}
            </button>
          )}
          <button type="button" onClick={onImport} className="btn-secondary h-9 px-3">
            <Upload className="h-4 w-4" /> Import
          </button>
        </div>
      </div>

      {problems.map((connection) => (
        <div key={connection.id} className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-pen/30 bg-pen/10 px-3 py-2.5 sm:mx-5">
          <span className="flex items-start gap-2 text-[14px] text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-pen" />
            <span>
              <strong>{connection.aspspName}:</strong>{' '}
              {connection.status === 'expired' ? 'Freigabe abgelaufen – kurz neu bestätigen.' : connection.lastError ?? 'Abruf fehlgeschlagen.'}
            </span>
          </span>
          <button type="button" onClick={() => onReconnect(connection)} className="btn-primary h-8 px-3 text-[13px]">
            Neu verbinden
          </button>
        </div>
      ))}

      {banking.accounts.length === 0 ? (
        <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5">
          <button type="button" onClick={onOpenBankSettings} className="rounded-[12px] border border-line/15 bg-inset p-4 text-left hover:border-accent/50">
            <Landmark className="h-5 w-5 text-accent" />
            <span className="mt-2 block font-bold text-ink">George automatisch</span>
            <span className="mt-0.5 block text-[13px] text-ink-3">Umsätze holt LifeTracker selbst ab (über Enable Banking, kostenlos).</span>
          </button>
          <button type="button" onClick={onImport} className="rounded-[12px] border border-line/15 bg-inset p-4 text-left hover:border-accent/50">
            <Upload className="h-5 w-5 text-accent" />
            <span className="mt-2 block font-bold text-ink">Export hochladen</span>
            <span className="mt-0.5 block text-[13px] text-ink-3">Trade Republic (CSV), Finanzguru (Excel) oder George-Export.</span>
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line/10 px-4 pb-2 sm:px-5">
          {banking.accounts.map((account) => {
            const connection = banking.connections.find((c) => c.id === account.connectionId);
            const updated = connection?.lastSyncAt ?? account.lastImportAt;
            return (
              <li key={account.id} className={`group flex items-center gap-3 py-3 ${account.includeInBalance ? '' : 'opacity-55'}`}>
                <span className="flex h-9 w-11 flex-shrink-0 items-center justify-center rounded-[8px] border border-line/15 bg-inset font-mono text-[10px] font-semibold text-ink-2">
                  {SOURCE_BADGE[account.source] ?? 'KTO'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-ink">{account.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">
                    {[
                      maskIban(account.iban),
                      SOURCE_LABELS[account.source] ?? account.source,
                      updated ? `${account.source === 'enablebanking' ? 'abgerufen' : 'importiert'} ${formatDistanceToNow(new Date(updated), { addSuffix: true, locale: de })}` : null,
                      `${account.transactionCount} Umsätze`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="flex-shrink-0 text-right">
                  <span className={`block font-mono text-[15px] font-medium tabular ${account.balance < 0 ? 'text-pen' : 'text-ink'}`}>{formatEuro(account.balance)}</span>
                  <span className="block text-[11px] text-ink-3">
                    {account.balanceIsReported && account.balanceUpdatedAt
                      ? `Stand ${format(new Date(account.balanceUpdatedAt), 'd. MMM', { locale: de })}`
                      : 'aus Umsätzen'}
                  </span>
                </span>
                <span className="flex flex-shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => onToggleInclude(account)}
                    className="icon-btn h-9 w-9"
                    aria-label={account.includeInBalance ? 'Nicht zum Kontostand zählen' : 'Zum Kontostand zählen'}
                    title={account.includeInBalance ? 'Zählt zum Kontostand' : 'Zählt nicht zum Kontostand'}
                  >
                    {account.includeInBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAccount(account)}
                    className="icon-btn h-9 w-9 hover:text-pen sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                    aria-label={`${account.name} entfernen`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            );
          })}
          <li className="py-2">
            <button type="button" onClick={onOpenBankSettings} className="btn-ghost -ml-2 h-8 px-2 text-[13px]">
              <Landmark className="h-4 w-4" /> Bank verbinden
            </button>
          </li>
        </ul>
      )}
    </section>
  );
};
