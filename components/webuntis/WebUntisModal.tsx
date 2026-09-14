'use client';

import React, { useState } from 'react';
import { WebUntisConfig } from '@/types';
import { 
  GraduationCap, 
  X, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  ExternalLink, 
  ShieldCheck, 
  School 
} from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';

interface WebUntisModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WebUntisConfig | null;
  onSyncCompleted: (result: any) => void;
}

export const WebUntisModal: React.FC<WebUntisModalProps> = ({
  isOpen,
  onClose,
  config,
  onSyncCompleted,
}) => {
  const [school, setSchool] = useState(config?.school || 'gym-st-michael');
  const [schoolName, setSchoolName] = useState(config?.schoolName || 'Gymnasium St. Michael');
  const [server, setServer] = useState(config?.server || 'arche.webuntis.com');
  const [username, setUsername] = useState(config?.username || 'alexander.student');
  const [password, setPassword] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      // First update config if changed
      await fetch('/api/v1/webuntis/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school,
          schoolName,
          server,
          username,
          password: password || undefined,
        }),
      });

      // Trigger sync
      const res = await fetch('/api/v1/webuntis/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncStatusMsg(data.message);
        fireMilestoneGlow();
        onSyncCompleted(data);
      } else {
        alert(data.error || 'Synchronisation fehlgeschlagen');
      }
    } catch (err) {
      console.error(err);
      alert('Verbindungsfehler zu WebUntis');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-lg rounded-3xl bg-[#11141D] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#141824]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <School className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                WebUntis Integration
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Live Sync
                </span>
              </h3>
              <p className="text-[11px] text-muted">Stundenplan, Fächer, Räume & Hausaufgaben</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Banner */}
          <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-white mb-0.5">
                  Automatischer Fächer- & Stundenplan-Abgleich
                </div>
                <p className="text-indigo-200/80 leading-relaxed">
                  Synchronisiert deinen gesamten Wochenstundenplan mit Räumen (z. B. <em>R204, Physiksaal</em>), Lehrern und allen in WebUntis eingetragenen Hausaufgaben. Selbst eingetragene Hausaufgaben werden automatisch an die jeweilige Stunde angeheftet!
                </p>
              </div>
            </div>
          </div>

          {/* Sync status feedback message */}
          {syncStatusMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* Credentials Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Schulname (Anzeige)
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="z. B. Gymnasium St. Michael, HTL Wien..."
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Schul-Kürzel (Untis)
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="gym-st-michael"
                  className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Untis Server
                </label>
                <input
                  type="text"
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder="arche.webuntis.com"
                  className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Benutzername
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alexander.student"
                  className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Passwort (Optional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSchool('gym-st-michael');
                setSchoolName('Gymnasium St. Michael');
                setServer('arche.webuntis.com');
                setUsername('alexander.student');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline"
            >
              Standard-Schule laden
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-white"
              >
                Schließen
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronisiere...' : 'Jetzt Synchronisieren'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
