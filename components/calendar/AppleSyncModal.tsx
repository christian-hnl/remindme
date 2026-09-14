'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  X, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  ExternalLink, 
  Smartphone, 
  Laptop, 
  Bell, 
  BookOpen, 
  School 
} from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';

interface AppleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppleSyncModal: React.FC<AppleSyncModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const httpUrl = `${protocol}//${host}/api/v1/calendar/ical`;
  const webcalUrl = `webcal://${host}/api/v1/calendar/ical`;

  const handleCopy = () => {
    navigator.clipboard.writeText(httpUrl);
    setCopied(true);
    fireMilestoneGlow();
    setTimeout(() => setCopied(false), 2500);
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
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Apple Kalender & Ereignisse Live-Sync
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  webcal://
                </span>
              </h3>
              <p className="text-[11px] text-muted">iPhone, iPad & Mac Kalender-Abonnement</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Feature highlights pill */}
          <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-4 space-y-2">
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Was wird synchronisiert?</span>
            </div>
            <ul className="text-xs text-indigo-200/80 space-y-1.5">
              <li className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                <span><strong>Alle Hausaufgaben:</strong> Fälligkeit, Fach & 1h-Vorwarnungs-Alarm</span>
              </li>
              <li className="flex items-center gap-2">
                <School className="h-3.5 w-3.5 text-purple-400" />
                <span><strong>WebUntis Stundenplan:</strong> Mit Raumangaben, Lehrern & Vertretungen</span>
              </li>
              <li className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-amber-400" />
                <span><strong>Terminierte Erinnerungen:</strong> Mit Apple-Hinweiston</span>
              </li>
            </ul>
          </div>

          {/* 1-Click Action Button */}
          <div className="pt-2">
            <a
              href={webcalUrl}
              onClick={() => fireMilestoneGlow()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 active:scale-[0.98] transition-all"
            >
              <Calendar className="h-4 w-4" />
              <span>In Apple Kalender öffnen & abonnieren</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-75" />
            </a>
          </div>

          {/* Copy Feed URL */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider">
              Abonnement-URL (Zum manuellen Eintragen in Kalender-Apps)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={httpUrl}
                className="w-full rounded-xl bg-[#161B26] border border-white/10 px-3 py-2 text-xs text-muted font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white border border-white/5 transition-colors flex-shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Kopiert' : 'Kopieren'}</span>
              </button>
            </div>
          </div>

          {/* Direct Download .ics */}
          <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
            <a
              href="/api/v1/calendar/ical"
              download="lifetracker-apple-sync.ics"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-purple-400" />
              <span>Einmalige .ics Datei herunterladen</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-white"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
