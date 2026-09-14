'use client';

import React, { useState, useEffect } from 'react';
import { WebUntisConfig, Subject } from '@/types';
import { 
  Settings, 
  X, 
  School, 
  Calendar, 
  Wallet, 
  Palette, 
  Database, 
  Check, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  Download, 
  AlertCircle,
  ExternalLink,
  Plus
} from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  untisConfig: WebUntisConfig | null;
  subjects: Subject[];
  user: {
    displayName: string;
    monthlyBudget?: number;
  };
  onSettingsSaved: () => void;
  onOpenUntisModal?: () => void;
  onOpenAppleSyncModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  untisConfig,
  subjects: initialSubjects,
  user,
  onSettingsSaved,
  onOpenUntisModal,
  onOpenAppleSyncModal,
}) => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'general' | 'subjects' | 'data'>('integrations');

  // General settings state
  const [displayName, setDisplayName] = useState(user.displayName || 'Alexander');
  const [monthlyBudget, setMonthlyBudget] = useState(user.monthlyBudget ? user.monthlyBudget.toString() : '580');

  // WebUntis state
  const [server, setServer] = useState(untisConfig?.server || 'arche.webuntis.com');
  const [school, setSchool] = useState(untisConfig?.school || 'gym-st-michael');
  const [schoolName, setSchoolName] = useState(untisConfig?.schoolName || 'Gymnasium St. Michael');
  const [username, setUsername] = useState(untisConfig?.username || 'alexander.student');
  const [password, setPassword] = useState('');
  const [icalUrl, setIcalUrl] = useState(untisConfig?.icalUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Subjects state
  const [subjectsList, setSubjectsList] = useState<Subject[]>(initialSubjects);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setSubjectsList(initialSubjects);
  }, [initialSubjects]);

  if (!isOpen) return null;

  const handleTestUntis = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/webuntis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, school, username, password }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) fireMilestoneGlow();
    } catch (err: any) {
      setTestResult({ success: false, message: 'Verbindungstest fehlgeschlagen.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncUntis = async () => {
    setIsSyncing(true);
    try {
      // First save untis config
      await fetch('/api/v1/webuntis/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, school, schoolName, username, password, icalUrl }),
      });

      const res = await fetch('/api/v1/webuntis/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: data.message });
        fireMilestoneGlow();
        onSettingsSaved();
      } else {
        alert(data.error || 'Sync fehlgeschlagen');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. Save general settings & subjects
      await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          monthlyBudget: parseFloat(monthlyBudget) || 580,
          subjects: subjectsList,
        }),
      });

      // 2. Save WebUntis config
      await fetch('/api/v1/webuntis/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server,
          school,
          schoolName,
          username,
          password: password || undefined,
          icalUrl: icalUrl || null,
        }),
      });

      setSaveSuccess(true);
      fireMilestoneGlow();
      onSettingsSaved();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Save error', err);
      alert('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = () => {
    window.open('/api/v1/dashboard/summary', '_blank');
  };

  const colorPalette = ['#6366F1', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#3B82F6', '#06B6D4', '#EAB308'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-3xl rounded-3xl bg-[#11141D] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#141824] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">System & Einstellungen</h3>
              <p className="text-xs text-muted">Integrationen, Safe-to-Spend Budget & Fächer-Verwaltung</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body with Tabs */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-full md:w-56 p-3 border-r border-white/[0.06] bg-[#0D1017]/40 flex-shrink-0 flex md:flex-col gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap ${
                activeTab === 'integrations'
                  ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <School className="h-4 w-4 text-purple-400" />
              <span>Integrationen</span>
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap ${
                activeTab === 'general'
                  ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span>Budget & Profil</span>
            </button>

            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap ${
                activeTab === 'subjects'
                  ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Palette className="h-4 w-4 text-amber-400" />
              <span>Fächer & Untis</span>
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap ${
                activeTab === 'data'
                  ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Database className="h-4 w-4 text-blue-400" />
              <span>Daten & Backup</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[520px] space-y-5">
            
            {/* ================================================================= */}
            {/* TAB 1: INTEGRATIONEN (WebUntis, Apple, Banking)                    */}
            {/* ================================================================= */}
            {activeTab === 'integrations' && (
              <div className="space-y-5">
                {/* WebUntis Section */}
                <div className="p-4 rounded-2xl bg-[#161B26] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4 text-purple-400" />
                      <span className="font-semibold text-sm text-white">WebUntis Konfiguration</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300">
                      JSON-RPC 2.0 & iCal
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    Trage deine WebUntis-Zugangsdaten oder deinen privaten iCal-Abonnement-Link ein, um Stundenplan, Räume, Lehrer und Hausaufgaben automatisch zu synchronisieren.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-muted uppercase font-medium mb-1">Untis Server</label>
                      <input
                        type="text"
                        value={server}
                        onChange={(e) => setServer(e.target.value)}
                        placeholder="arche.webuntis.com"
                        className="w-full rounded-xl bg-[#11141D] border border-white/10 px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted uppercase font-medium mb-1">Schul-Kürzel</label>
                      <input
                        type="text"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="gym-st-michael"
                        className="w-full rounded-xl bg-[#11141D] border border-white/10 px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-muted uppercase font-medium mb-1">Benutzername</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="alexander.student"
                        className="w-full rounded-xl bg-[#11141D] border border-white/10 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted uppercase font-medium mb-1">Passwort</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl bg-[#11141D] border border-white/10 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted uppercase font-medium mb-1">
                      Oder privater Untis iCal Feed-Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={icalUrl}
                      onChange={(e) => setIcalUrl(e.target.value)}
                      placeholder="https://arche.webuntis.com/WebUntis/ical?school=..."
                      className="w-full rounded-xl bg-[#11141D] border border-white/10 px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  {testResult && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    }`}>
                      {testResult.success ? <Check className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-rose-400" />}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setServer('arche.webuntis.com');
                        setSchool('gym-st-michael');
                        setSchoolName('Gymnasium St. Michael');
                        setUsername('alexander.student');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Demo-Schule eintragen
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestUntis}
                        disabled={isTesting}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10"
                      >
                        {isTesting ? 'Teste...' : 'Verbindung testen'}
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncUntis}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Synchronisiere...' : 'Jetzt Synchronisieren'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Apple & Google Calendar Feed */}
                <div className="p-4 rounded-2xl bg-[#161B26] border border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-400" />
                    <span className="font-semibold text-sm text-white">Apple Kalender & Google Calendar Feed</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Alle Hausaufgaben, WebUntis-Vorlesungen und terminierte Erinnerungen werden via iCal live bereitgestellt.
                  </p>
                  <div className="text-xs font-mono text-indigo-300 bg-black/40 p-2 rounded-xl border border-white/5 select-all">
                    webcal://{typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}/api/v1/calendar/ical
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 2: BUDGET & ALLGEMEIN                                         */}
            {/* ================================================================= */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#161B26] border border-white/5 space-y-3">
                  <span className="font-semibold text-sm text-white block">Benutzerprofil</span>
                  
                  <div>
                    <label className="block text-[11px] text-muted uppercase font-medium mb-1">Anzeigename</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-xl bg-[#11141D] border border-white/10 px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Safe-to-Spend Monthly Budget */}
                <div className="p-4 rounded-2xl bg-[#161B26] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-sm text-white">Safe-to-Spend Puffer-Budget</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Wie viel freies Geld möchtest du pro Monat für Freizeit, Essen & spontane Ausgaben verplanen? Dieser Betrag wird durch die verbleibenden Tage des Monats geteilt und berechnet die Anzeige: <strong>„Heute noch X € frei“</strong>.
                  </p>

                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      step="10"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                      placeholder="580"
                      className="w-full rounded-xl bg-[#11141D] border border-white/10 px-3.5 py-2 text-sm text-white font-mono"
                    />
                    <span className="absolute right-3.5 top-2 text-sm text-muted">€ / Monat</span>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 3: FÄCHER & FARBEN                                            */}
            {/* ================================================================= */}
            {activeTab === 'subjects' && (
              <div className="space-y-3">
                <div className="text-xs text-muted leading-relaxed mb-2">
                  Passe die Schulfächer, Untis-Kürzel und Farben für deinen Stundenplan an:
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {subjectsList.map((subj, idx) => (
                    <div key={subj.id || idx} className="p-3 rounded-2xl bg-[#161B26] border border-white/5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-4 w-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: subj.colorHex }}
                        />
                        <div>
                          <input
                            type="text"
                            value={subj.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSubjectsList((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, name: val } : s))
                              );
                            }}
                            className="bg-transparent text-xs font-semibold text-white focus:outline-none"
                          />
                          <div className="text-[10px] text-muted flex items-center gap-1 font-mono">
                            Untis Kürzel:
                            <input
                              type="text"
                              value={subj.untisCode || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSubjectsList((prev) =>
                                  prev.map((s, i) => (i === idx ? { ...s, untisCode: val } : s))
                                );
                              }}
                              placeholder="Kürzel"
                              className="w-14 bg-black/40 px-1 py-0.5 rounded border border-white/10 uppercase text-white font-mono text-[10px]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Color dots */}
                      <div className="flex items-center gap-1">
                        {colorPalette.slice(0, 5).map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              setSubjectsList((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, colorHex: col } : s))
                              );
                            }}
                            className={`h-5 w-5 rounded-full border transition-transform ${
                              subj.colorHex === col ? 'scale-110 border-white' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 4: DATEN & BACKUP                                             */}
            {/* ================================================================= */}
            {activeTab === 'data' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#161B26] border border-white/5 space-y-2">
                  <span className="font-semibold text-sm text-white block">Vollständiger Daten-Export</span>
                  <p className="text-xs text-muted">
                    Lade alle Aufgaben, Stundenpläne, Spartöpfe, Transaktionen und Notizen als strukturierte JSON-Datei herunter.
                  </p>
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 transition-colors"
                  >
                    <Download className="h-4 w-4 text-indigo-400" />
                    <span>JSON Backup herunterladen</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/[0.06] bg-[#141824] flex-shrink-0">
          <div>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Einstellungen erfolgreich gespeichert!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-white"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? 'Speichere...' : 'Einstellungen sichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
