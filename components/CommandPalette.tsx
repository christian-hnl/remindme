'use client';

import React, { useState, useEffect } from 'react';
import { 
  Command, 
  Search, 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Wallet, 
  GraduationCap, 
  PlusCircle, 
  Download,
  X 
} from 'lucide-react';
import { parseNaturalLanguage, ParsedIntent } from '@/lib/nlp-parser';
import { WorkspaceMode } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAddSuccess: (result: any) => void;
  setActiveMode: (mode: WorkspaceMode) => void;
  openCreateTaskModal: () => void;
  openCreatePotModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onQuickAddSuccess,
  setActiveMode,
  openCreateTaskModal,
  openCreatePotModal,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live NLP intent parsing
  useEffect(() => {
    if (query.trim()) {
      const intent = parseNaturalLanguage(query);
      setParsedIntent(intent);
    } else {
      setParsedIntent(null);
    }
  }, [query]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query }),
      });
      const data = await res.json();
      if (res.ok) {
        onQuickAddSuccess(data);
        setQuery('');
        onClose();
      } else {
        alert(data.error || 'Fehler beim Erstellen');
      }
    } catch (err) {
      console.error('Quick add failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-20 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-[#11141D] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center border-b border-white/10 px-4 py-3.5 bg-[#141824]">
          <Search className="h-5 w-5 text-indigo-400 mr-3 flex-shrink-0" />
          <input
            id="command-palette-input"
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="„Physik Protokoll bis Fr 18:00 45min Prio 1“ oder „15€ Döner“..."
            className="w-full bg-transparent text-sm text-white placeholder-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-muted hover:text-white p-1 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-muted bg-white/5 border border-white/10 rounded ml-2">
            ESC
          </kbd>
        </form>

        {/* Live Natural Language Preview Pill */}
        {parsedIntent && (
          <div className="bg-indigo-950/40 border-b border-indigo-500/20 px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
              <span className="font-medium">Live NLP Intent erkannt:</span>
              
              {parsedIntent.type === 'task' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                    📚 {parsedIntent.title}
                  </span>
                  {parsedIntent.subjectName && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {parsedIntent.subjectName}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {parsedIntent.estimatedMinutes}m
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⚡ {parsedIntent.priority}
                  </span>
                </div>
              )}

              {parsedIntent.type === 'transaction' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {parsedIntent.txType === 'income' ? '📈 Einnahme' : '💳 Ausgabe'}: {parsedIntent.amount.toFixed(2)} €
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                    {parsedIntent.title} ({parsedIntent.category})
                  </span>
                </div>
              )}

              {parsedIntent.type === 'deposit' && (
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    🎯 +{parsedIntent.amount.toFixed(2)} € in "{parsedIntent.potName}"
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-all ml-2"
            >
              <span>{loading ? 'Speichere...' : 'Eintragen'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Quick Actions & Suggestions */}
        <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
            Schnell-Aktionen (Raycast Mode)
          </div>

          <button
            onClick={() => {
              openCreateTaskModal();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-white/90 hover:bg-white/5 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <PlusCircle className="h-4 w-4 text-indigo-400" />
              <span>Neue Hausaufgabe anlegen...</span>
            </div>
            <span className="text-[11px] text-muted font-mono">N</span>
          </button>

          <button
            onClick={() => {
              openCreatePotModal();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-white/90 hover:bg-white/5 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span>Neuen Spartopf eröffnen...</span>
            </div>
            <span className="text-[11px] text-muted font-mono">S</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('study');
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-white/90 hover:bg-white/5 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap className="h-4 w-4 text-indigo-400" />
              <span>Deep Study Modus aktivieren</span>
            </div>
            <span className="text-[11px] text-muted">Fokus & Pomodoro</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('wealth');
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-white/90 hover:bg-white/5 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span>Wealth & Budget Modus aktivieren</span>
            </div>
            <span className="text-[11px] text-muted">Spartöpfe & Cashflow</span>
          </button>

          <a
            href="/api/v1/calendar/ical"
            download="lifetracker.ics"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-white/90 hover:bg-white/5 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Download className="h-4 w-4 text-purple-400" />
              <span>iCal Kalender-Feed exportieren (Apple / Google)</span>
            </div>
            <span className="text-[11px] text-muted font-mono">.ics</span>
          </a>
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between border-t border-white/5 bg-[#0D1017] px-4 py-2 text-[11px] text-muted">
          <span>Drücke <kbd className="font-mono text-white/80 bg-white/10 px-1 py-0.5 rounded">Enter ↵</kbd> zum Absenden des NLP-Befehls</span>
          <span>Raycast Engine 2.0</span>
        </div>
      </div>
    </div>
  );
};
