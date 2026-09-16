'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarPlus, Check, Copy, Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface AppleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Feed token when the app is password protected; null otherwise. */
  icalToken: string | null;
}

export const AppleSyncModal: React.FC<AppleSyncModalProps> = ({ isOpen, onClose, icalToken }) => {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const path = `/api/v1/calendar/ical${icalToken ? `?token=${icalToken}` : ''}`;
  const httpUrl = `${origin}${path}`;
  const webcalUrl = httpUrl.replace(/^https?:/, 'webcal:');
  const isLocal = /\/\/(localhost|127\.0\.0\.1)/.test(origin);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(httpUrl);
    } catch {
      // Clipboard API needs HTTPS; fall back to selecting the text.
      inputRef.current?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kalender abonnieren"
      subtitle="iPhone, Mac oder Google Kalender"
      icon={<CalendarPlus className="h-[18px] w-[18px]" />}
      footer={
        <>
          <a href={path} download="lifetracker.ics" className="btn-ghost mr-auto">
            <Download className="h-4 w-4" /> Als Datei
          </a>
          <button type="button" onClick={onClose} className="btn-secondary">
            Fertig
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-[15px] leading-relaxed text-ink-2">
          Dein Stundenplan, fällige Hausübungen und Erinnerungen mit Termin erscheinen in deinem Kalender und aktualisieren sich
          automatisch.
        </p>

        {isLocal && (
          <p className="flex gap-2 rounded-[10px] border border-warn/30 bg-warn/10 p-3 text-[14px] text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warn" />
            <span>
              Du nutzt LifeTracker über <span className="font-mono">localhost</span>. Dein Handy erreicht diese Adresse nicht – öffne die
              App über die Netzwerk-Adresse deines PCs und hol dir den Link dort.
            </span>
          </p>
        )}

        <a href={webcalUrl} className="btn-primary h-12 w-full text-[16px]">
          <CalendarPlus className="h-5 w-5" /> In Apple Kalender öffnen
        </a>

        <div>
          <label htmlFor="ical-url" className="field-label">
            Oder Link kopieren (Google Kalender: „Per URL hinzufügen“)
          </label>
          <div className="flex gap-2">
            <input ref={inputRef} id="ical-url" readOnly value={httpUrl} onFocus={(e) => e.target.select()} className="field-input font-mono text-[13px] text-ink-2" />
            <button type="button" onClick={handleCopy} className="btn-secondary flex-shrink-0">
              {copied ? <Check className="h-4 w-4 text-leaf" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
          {icalToken && <p className="mt-1.5 text-[13px] text-ink-3">Der Link enthält einen geheimen Schlüssel – nicht öffentlich teilen.</p>}
        </div>
      </div>
    </Modal>
  );
};
