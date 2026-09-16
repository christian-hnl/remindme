'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertCircle, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatEuro } from '@/lib/format';

interface PreviewAccount {
  name: string;
  count: number;
  newCount: number;
  duplicates: number;
  from: string;
  to: string;
  exists: boolean;
}

interface Preview {
  profile: string;
  profileLabel: string;
  columns: Record<string, string>;
  skippedRows: number;
  accounts: PreviewAccount[];
  sample: { date: string; title: string; category: string; type: string; amount: number; accountName: string }[];
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (message: string) => void;
}

const HINTS = [
  ['Trade Republic', 'App → Profil → Kontoauszüge → Transaktionsexport (CSV)'],
  ['Finanzguru', 'Analyse → Umsätze exportieren (Excel, mit Finanzguru Plus)'],
  ['George', 'Konto → Umsätze → Exportieren (CSV, Excel oder JSON)'],
];

const FIELD_LABELS: Record<string, string> = { date: 'Datum', amount: 'Betrag', counterparty: 'Name', description: 'Zweck', account: 'Konto', category: 'Kategorie' };

async function send(file: File, mode: 'preview' | 'commit', accounts?: string[]) {
  const form = new FormData();
  form.append('file', file);
  form.append('mode', mode);
  if (accounts) form.append('accounts', JSON.stringify(accounts));
  let res: Response;
  try {
    res = await fetch('/api/v1/banking/import', { method: 'POST', body: form });
  } catch {
    throw new Error('Keine Verbindung zum Server');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Import fehlgeschlagen (${res.status})`);
  return data;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImported }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setPreview(null);
    setSelected([]);
    setError(null);
  }, [isOpen]);

  const choose = async (chosen: File | undefined) => {
    if (!chosen) return;
    setFile(chosen);
    setError(null);
    setBusy('preview');
    try {
      const data: Preview = await send(chosen, 'preview');
      setPreview(data);
      // Accounts without new bookings are pre-deselected.
      setSelected(data.accounts.filter((a) => a.newCount > 0).map((a) => a.name));
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : 'Datei konnte nicht gelesen werden');
    } finally {
      setBusy(null);
    }
  };

  const commit = async () => {
    if (!file || selected.length === 0) return;
    setBusy('commit');
    try {
      const result: { created: number; duplicates: number } = await send(file, 'commit', selected);
      onImported(
        `${result.created} ${result.created === 1 ? 'Umsatz' : 'Umsätze'} importiert${result.duplicates ? `, ${result.duplicates} waren schon da` : ''}`
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    } finally {
      setBusy(null);
    }
  };

  const newTotal = preview?.accounts.filter((a) => selected.includes(a.name)).reduce((s, a) => s + a.newCount, 0) ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Umsätze importieren"
      subtitle={preview ? `${preview.profileLabel} · ${file?.name}` : 'Trade Republic, Finanzguru, George oder Kontoauszug'}
      icon={<Upload className="h-[18px] w-[18px]" />}
      footer={
        preview ? (
          <>
            <button type="button" onClick={() => { setPreview(null); setFile(null); }} className="btn-ghost mr-auto">
              Andere Datei
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">
              Abbrechen
            </button>
            <button type="button" onClick={commit} disabled={busy !== null || newTotal === 0} className="btn-primary">
              {busy === 'commit' ? 'Importiert…' : newTotal === 0 ? 'Nichts Neues' : `${newTotal} Umsätze importieren`}
            </button>
          </>
        ) : (
          <button type="button" onClick={onClose} className="btn-secondary">
            Abbrechen
          </button>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-[10px] border border-pen/30 bg-pen/10 p-3 text-[14px] text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-pen" /> {error}
        </p>
      )}

      {!preview ? (
        <>
          <label
            htmlFor="import-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files[0]);
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-[14px] border-2 border-dashed px-4 py-10 text-center transition-colors ${
              dragging ? 'border-accent bg-accent/5' : 'border-line/20 bg-inset hover:border-accent/60'
            }`}
          >
            <Upload className="h-7 w-7 text-accent" />
            <span className="font-bold text-ink">{busy === 'preview' ? 'Liest Datei…' : 'Datei auswählen oder hierher ziehen'}</span>
            <span className="text-[13px] text-ink-3">CSV, Excel (.xlsx) oder JSON · max. 10 MB</span>
            <input id="import-file" type="file" accept=".csv,.txt,.xlsx,.json" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} disabled={busy !== null} />
          </label>
          <ul className="mt-5 space-y-3">
            {HINTS.map(([source, path]) => (
              <li key={source} className="text-[14px]">
                <span className="font-bold text-ink">{source}:</span> <span className="text-ink-2">{path}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-ink-3">Doppelte Umsätze werden erkannt – du kannst dieselbe Datei gefahrlos mehrmals hochladen.</p>
        </>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="field-label">Konten in der Datei</p>
            <ul className="space-y-2">
              {preview.accounts.map((account) => (
                <li key={account.name}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-line/15 p-3 hover:bg-inset">
                    <input
                      type="checkbox"
                      checked={selected.includes(account.name)}
                      onChange={(e) =>
                        setSelected((list) => (e.target.checked ? [...list, account.name] : list.filter((n) => n !== account.name)))
                      }
                      className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink">{account.name}</span>
                      <span className="block text-[13px] text-ink-3">
                        {format(new Date(account.from), 'd.M.yyyy')} – {format(new Date(account.to), 'd.M.yyyy')} · {account.count} Umsätze
                      </span>
                    </span>
                    <span className="text-right text-[13px]">
                      <span className="block font-bold text-leaf">{account.newCount} neu</span>
                      {account.duplicates > 0 && <span className="block text-ink-3">{account.duplicates} schon da</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {preview.accounts.length > 1 && (
              <p className="mt-2 text-[13px] text-ink-3">Tipp: Konten, die schon automatisch abgerufen werden (z. B. George), hier abwählen.</p>
            )}
          </div>

          <div>
            <p className="field-label">Vorschau</p>
            <div className="overflow-x-auto rounded-[10px] border border-line/10">
              <table className="w-full min-w-[480px] text-[13px]">
                <tbody className="divide-y divide-line/10">
                  {preview.sample.map((row, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-3">{format(new Date(row.date), 'd. MMM', { locale: de })}</td>
                      <td className="max-w-[220px] truncate px-3 py-2 font-bold text-ink">{row.title}</td>
                      <td className="px-3 py-2">
                        <span className="chip">{row.category}</span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-mono ${row.amount > 0 && row.type === 'income' ? 'text-leaf' : 'text-ink'}`}>
                        {row.amount > 0 ? '+' : '−'}
                        {formatEuro(Math.abs(row.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] text-ink-3">
              Erkannte Spalten:{' '}
              {Object.entries(preview.columns)
                .filter(([field]) => FIELD_LABELS[field])
                .map(([field, header]) => `${FIELD_LABELS[field]} = „${header}“`)
                .join(', ')}
              {preview.skippedRows > 0 && ` · ${preview.skippedRows} Zeilen ohne Datum/Betrag übersprungen`}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
};
