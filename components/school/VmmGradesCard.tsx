'use client';

import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronDown, RefreshCw, Settings2 } from 'lucide-react';
import type { Subject, VmmConfig } from '@/types';
import { linkVmmGroups } from '@/lib/school/vmm-link';
import { POSITIVE_LIMIT } from '@/lib/school/planner';
import { api, errorMessage } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';

interface VmmGradesCardProps {
  config: VmmConfig | null;
  subjects: Subject[];
  onChanged: (config: VmmConfig) => void;
  onOpenSettings: () => void;
}

const gradeTone = (average: number | null) => {
  if (average === null) return 'text-ink-3';
  if (average > POSITIVE_LIMIT) return 'text-pen';
  if (average >= 3.5) return 'text-warn';
  if (average <= 2) return 'text-leaf';
  return 'text-ink';
};

/** The grades as View My Marks has them, mapped onto the subjects the app already knows. */
export function VmmGradesCard({ config, subjects, onChanged, onOpenSettings }: VmmGradesCardProps) {
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const links = useMemo(() => linkVmmGroups(config?.groups ?? [], subjects), [config?.groups, subjects]);

  const overall = useMemo(() => {
    const values = links.map((l) => l.average).filter((a): a is number => a !== null);
    return values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100 : null;
  }, [links]);

  const sync = async () => {
    setSyncing(true);
    try {
      const result = await api<{ message?: string; config?: VmmConfig }>('/api/v1/vmm', { body: { action: 'sync' } });
      if (result.config) onChanged(result.config);
      toast(result.message ?? 'Noten aktualisiert');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (!config?.isConnected && links.length === 0) {
    return (
      <section className="card" aria-label="Noten aus View My Marks">
        <div className="p-4 pb-2 sm:p-5 sm:pb-2">
          <p className="eyebrow">View My Marks</p>
          <h2 className="card-title mt-1">Noten vom Notenportal</h2>
        </div>
        <div className="px-5 pb-5">
          <p className="text-[14px] text-ink-2">
            Verbinde dein VMM-Konto, dann stehen deine Noten hier – und der Lernplan rechnet damit, was du auf die nächsten Tests brauchst.
          </p>
          <button type="button" onClick={onOpenSettings} className="btn-secondary mt-3">
            <Settings2 className="h-4 w-4" /> Verbinden
          </button>
        </div>
      </section>
    );
  }

  const negative = links.filter((l) => l.average !== null && l.average > POSITIVE_LIMIT);

  return (
    <section className="card" aria-label="Noten aus View My Marks">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
        <div className="min-w-0">
          <p className="eyebrow">View My Marks</p>
          <h2 className="card-title mt-1">Noten</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {links.length} {links.length === 1 ? 'Fach' : 'Fächer'}
            {overall !== null && ` · Schnitt ${overall.toFixed(2)}`}
            {negative.length > 0 && ` · ${negative.length} gefährdet`}
            {config?.lastSyncAt && ` · ${format(new Date(config.lastSyncAt), 'd. MMM, HH:mm', { locale: de })}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={sync} disabled={syncing || !config?.isConnected} className="icon-btn h-9 w-9" aria-label="Noten abrufen" title="Noten abrufen">
            <RefreshCw className={`h-[17px] w-[17px] ${syncing ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={onOpenSettings} className="icon-btn h-9 w-9" aria-label="VMM-Einstellungen" title="Einstellungen">
            <Settings2 className="h-[17px] w-[17px]" />
          </button>
        </div>
      </div>

      {!config?.isConnected && (
        <p className="mx-4 mb-3 rounded-[10px] bg-warn/10 p-3 text-[13px] text-warn sm:mx-5">
          Die Sitzung ist abgelaufen – die Noten unten sind der letzte Stand. Fordere in den Einstellungen einen neuen Link an.
        </p>
      )}

      <ul className="divide-y divide-line/10 px-4 pb-4 sm:px-5">
        {links.map((link) => {
          const open = openId === link.group.id;
          return (
            <li key={link.group.id} className="py-2">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : link.group.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 text-left"
              >
                <span
                  className="h-7 w-1 flex-shrink-0 rounded-full"
                  style={{ background: link.subject?.colorHex ?? 'var(--line)' }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-ink">{link.subject?.name ?? link.group.subjectName ?? link.group.name}</span>
                  <span className="block truncate text-[13px] text-ink-3">
                    {link.graded.length} {link.graded.length === 1 ? 'Note' : 'Noten'}
                    {link.group.teacher && ` · ${link.group.teacher}`}
                    {!link.subject && ' · keinem Fach zugeordnet'}
                  </span>
                </span>
                <span className={`tabular font-display text-[19px] font-bold ${gradeTone(link.average)}`}>
                  {link.average === null ? '–' : link.average.toFixed(2)}
                </span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-ink-3 transition-transform ${open ? '' : '-rotate-90'}`} />
              </button>

              {open && (
                <ul className="ml-4 mt-2 space-y-1 rounded-[10px] bg-inset p-3 text-[13px]">
                  {link.graded.length === 0 && <li className="text-ink-3">Noch keine benoteten Einträge.</li>}
                  {link.graded.map((mark, i) => (
                    <li key={`${link.group.id}-${i}`} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-ink-2">
                        {mark.mark.title}
                        {mark.mark.date && ` · ${format(new Date(mark.mark.date), 'd. MMM', { locale: de })}`}
                        {mark.weight !== 1 && ` · ×${mark.weight}`}
                      </span>
                      <span className="tabular font-bold text-ink">{mark.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {links.length === 0 && <li className="py-3 text-[14px] text-ink-3">Noch nichts abgerufen – tippe auf das Aktualisieren-Symbol.</li>}
      </ul>
    </section>
  );
}
