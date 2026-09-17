'use client';

import React, { useEffect, useState } from 'react';
import { CalendarPlus, Download, Plus, Settings, Trash2 } from 'lucide-react';
import type { DashboardSummary, Subject, WebUntisConfig } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { WebUntisConfigForm } from '@/components/webuntis/WebUntisConfigForm';
import { BankingSettings } from './BankingSettings';
import { api, errorMessage } from '@/lib/client';
import { parseAmount } from '@/lib/format';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: DashboardSummary['user'];
  subjects: Subject[];
  untisConfig: WebUntisConfig | null;
  onSettingsSaved: () => void;
  onUntisSynced: (message: string) => void;
  onOpenAppleSyncModal: () => void;
  initialTab?: SettingsTab;
  banking: DashboardSummary['banking'];
  onBankingChanged: () => void;
}

export type SettingsTab = 'profile' | 'school' | 'subjects' | 'banks' | 'data';
type Tab = SettingsTab;

interface SubjectDraft {
  key: string;
  id?: string;
  name: string;
  untisCode: string;
  colorHex: string;
}

const COLOR_PALETTE = ['#2A4BDC', '#8B5CF6', '#EC4899', '#E11D48', '#F59E0B', '#CA8A04', '#10B981', '#0D9488', '#06B6D4', '#64748B'];

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profil & Geld' },
  { id: 'school', label: 'WebUntis' },
  { id: 'subjects', label: 'Fächer' },
  { id: 'banks', label: 'Banken' },
  { id: 'data', label: 'Daten' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  subjects,
  untisConfig,
  onSettingsSaved,
  onUntisSynced,
  onOpenAppleSyncModal,
  initialTab,
  banking,
  onBankingChanged,
}) => {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('profile');
  const [displayName, setDisplayName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [startingBalance, setStartingBalance] = useState('');
  const [subjectDrafts, setSubjectDrafts] = useState<SubjectDraft[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialise only when opening, so background refreshes don't wipe edits.
  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab ?? 'profile');
    setDisplayName(user.displayName);
    setMonthlyBudget(String(user.monthlyBudget));
    setStartingBalance(String(user.startingBalance));
    setSubjectDrafts(subjects.map((s) => ({ key: s.id, id: s.id, name: s.name, untisCode: s.untisCode ?? '', colorHex: s.colorHex })));
    setDeletedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const updateSubject = (key: string, patch: Partial<SubjectDraft>) =>
    setSubjectDrafts((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const removeSubject = (draft: SubjectDraft) => {
    setSubjectDrafts((list) => list.filter((s) => s.key !== draft.key));
    if (draft.id) setDeletedIds((ids) => [...ids, draft.id!]);
  };

  const addSubject = () =>
    setSubjectDrafts((list) => [...list, { key: `new-${Date.now()}`, name: '', untisCode: '', colorHex: COLOR_PALETTE[list.length % COLOR_PALETTE.length] }]);

  const handleSave = async () => {
    const budget = parseAmount(monthlyBudget);
    const balance = parseAmount(startingBalance);
    if (!(budget >= 0)) return toast('Das Monatsbudget muss 0 oder mehr sein', 'error');
    if (Number.isNaN(balance)) return toast('Ungültiger Startkontostand', 'error');

    setSaving(true);
    try {
      await api('/api/v1/settings', {
        body: {
          displayName: displayName.trim(),
          monthlyBudget: budget,
          startingBalance: balance,
          subjects: subjectDrafts
            .filter((s) => s.name.trim())
            .map(({ id, name, untisCode, colorHex }) => ({ id, name: name.trim(), untisCode: untisCode.trim() || null, colorHex })),
          deletedSubjectIds: deletedIds,
        },
      });
      toast('Einstellungen gespeichert');
      onSettingsSaved();
      onClose();
    } catch (error) {
      toast(`Speichern fehlgeschlagen: ${errorMessage(error)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasFormFooter = tab === 'profile' || tab === 'subjects';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Einstellungen"
      icon={<Settings className="h-[18px] w-[18px]" />}
      bodyClassName="flex min-h-0 flex-col md:flex-row"
      footer={
        hasFormFooter ? (
          <>
            <button type="button" onClick={onClose} className="btn-ghost">
              Abbrechen
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
          </>
        ) : (
          <button type="button" onClick={onClose} className="btn-secondary">
            Fertig
          </button>
        )
      }
    >
      <nav
        className="scrollbar-none flex flex-shrink-0 gap-1 overflow-x-auto border-b border-line/10 p-3 md:w-48 md:flex-col md:border-b-0 md:border-r"
        role="tablist"
        aria-label="Bereiche"
      >
        {TABS.map(({ id, label }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="tab md:w-full md:justify-start md:rounded-[10px]">
            {label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
        {tab === 'profile' && (
          <>
            <div>
              <label htmlFor="settings-name" className="field-label">
                Dein Name
              </label>
              <input id="settings-name" value={displayName} maxLength={60} onChange={(e) => setDisplayName(e.target.value)} className="field-input" />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="settings-budget" className="field-label">
                  Monatsbudget
                </label>
                <div className="relative">
                  <input id="settings-budget" inputMode="decimal" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} className="field-input pr-9 font-mono" />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3">€</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
                  Geld für Essen, Freizeit und Spontanes – ohne Fixkosten. Daraus wird „Heute frei“ berechnet.
                </p>
              </div>
              <div>
                <label htmlFor="settings-balance" className="field-label">
                  Startkontostand
                </label>
                <div className="relative">
                  <input id="settings-balance" inputMode="decimal" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} className="field-input pr-9 font-mono" />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3">€</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
                  Kontostand vor deiner ersten Buchung. Der aktuelle Stand ergibt sich aus diesem Wert plus allen Buchungen.
                </p>
              </div>
            </div>
          </>
        )}

        {tab === 'school' && (
          <>
            <WebUntisConfigForm config={untisConfig} onSynced={onUntisSynced} onGroupsChanged={onSettingsSaved} />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-inset p-4">
              <div>
                <p className="font-bold text-ink">Im Handy-Kalender anzeigen</p>
                <p className="text-[13px] text-ink-2">Stundenplan, Hausübungen und Erinnerungen als Kalender-Abo.</p>
              </div>
              <button type="button" onClick={onOpenAppleSyncModal} className="btn-secondary">
                <CalendarPlus className="h-4 w-4" /> Einrichten
              </button>
            </div>
          </>
        )}

        {tab === 'subjects' && (
          <div>
            <p className="mb-4 text-[14px] leading-relaxed text-ink-2">
              Das Kürzel verbindet ein Fach mit WebUntis. Die Farbe erscheint im Stundenplan und bei den Hausübungen.
            </p>
            {subjectDrafts.length === 0 && <p className="text-[14px] text-ink-3">Noch keine Fächer.</p>}
            <ul className="divide-y divide-line/10">
              {subjectDrafts.map((s) => (
                <li key={s.key} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 flex-shrink-0 rounded-[5px]" style={{ backgroundColor: s.colorHex }} />
                    <input
                      value={s.name}
                      onChange={(e) => updateSubject(s.key, { name: e.target.value })}
                      placeholder="Fach"
                      maxLength={60}
                      autoFocus={!s.id && !s.name}
                      className="field-input h-10 min-w-0 flex-1 py-0 font-bold"
                      aria-label="Name des Fachs"
                    />
                    <input
                      value={s.untisCode}
                      onChange={(e) => updateSubject(s.key, { untisCode: e.target.value })}
                      placeholder="Kürzel"
                      maxLength={12}
                      className="field-input h-10 w-20 py-0 font-mono text-[13px] uppercase"
                      aria-label="Untis-Kürzel"
                    />
                    <button type="button" onClick={() => removeSubject(s)} className="icon-btn hover:text-pen" aria-label={`${s.name || 'Fach'} entfernen`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-7" role="group" aria-label="Farbe">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateSubject(s.key, { colorHex: color })}
                        aria-pressed={s.colorHex.toUpperCase() === color}
                        aria-label={`Farbe ${color}`}
                        className={`h-7 w-7 rounded-full border-[3px] ${s.colorHex.toUpperCase() === color ? 'border-ink' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" onClick={addSubject} className="btn-secondary mt-3 w-full">
              <Plus className="h-4 w-4" /> Fach hinzufügen
            </button>
            {deletedIds.length > 0 && (
              <p className="mt-3 text-[13px] font-bold text-warn">
                {deletedIds.length === 1 ? '1 Fach wird' : `${deletedIds.length} Fächer werden`} beim Speichern gelöscht. Hausübungen bleiben erhalten.
              </p>
            )}
          </div>
        )}

        {tab === 'banks' && <BankingSettings banking={banking} onChanged={onBankingChanged} />}

        {tab === 'data' && (
          <div className="space-y-3">
            <p className="font-bold text-ink">Alles exportieren</p>
            <p className="text-[14px] leading-relaxed text-ink-2">
              Lädt alle Aufgaben, Stundenpläne, Erinnerungen, Notizen, Spartöpfe und Buchungen als JSON-Datei herunter. Dein
              WebUntis-Passwort ist nicht enthalten.
            </p>
            <a href="/api/v1/export" download className="btn-secondary w-fit">
              <Download className="h-4 w-4" /> Backup herunterladen
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
};
