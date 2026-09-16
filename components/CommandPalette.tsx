'use client';

import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CalendarPlus,
  CreditCard,
  NotebookPen,
  GraduationCap,
  PiggyBank,
  PlusCircle,
  Rocket,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import { parseNaturalLanguage, type ParsedIntent } from '@/lib/nlp-parser';
import { api, errorMessage } from '@/lib/client';
import { relativeDayLabel } from '@/lib/format';
import type { Note, Reminder, Task, WorkspaceMode } from '@/types';
import { MODE_META, MODE_ORDER } from './modes';
import type { QuickKind } from './ui/QuickCreateSheet';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  notes: Note[];
  reminders: Reminder[];
  setActiveMode: (mode: WorkspaceMode) => void;
  onQuickAddSuccess: (message: string) => void;
  onOpenTask: (task: Task | null) => void;
  onOpenNote: (id: string) => void;
  onOpenCreatePot: () => void;
  onOpenTransaction: () => void;
  onOpenSettings: () => void;
  onOpenUntis: () => void;
  onOpenAppleSync: () => void;
  onQuickCreate: (kind: QuickKind) => void;
}

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

const PRIORITY_LABEL = { urgent: 'dringend', high: 'wichtig', medium: 'normal', low: 'locker' };
const icon = (Icon: typeof Search) => <Icon className="h-[18px] w-[18px] text-ink-3" />;

function describeIntent(intent: ParsedIntent) {
  if (intent.type === 'task') return `Aufgabe „${intent.title}“ anlegen`;
  if (intent.type === 'transaction') {
    return `${intent.txType === 'income' ? 'Einnahme' : 'Ausgabe'} „${intent.title}“ · ${intent.amount.toFixed(2)} € buchen`;
  }
  return `${intent.amount.toFixed(2)} € in ${intent.potName ? `„${intent.potName}“` : 'Spartopf'} einzahlen`;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tasks,
  notes,
  reminders,
  setActiveMode,
  onQuickAddSuccess,
  onOpenTask,
  onOpenNote,
  onOpenCreatePot,
  onOpenTransaction,
  onOpenSettings,
  onOpenUntis,
  onOpenAppleSync,
  onQuickCreate,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setError(null);
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  const trimmed = query.trim();
  const needle = trimmed.toLowerCase();
  const intent = trimmed ? parseNaturalLanguage(trimmed) : null;

  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };

  const submitQuickAdd = async () => {
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ message: string }>('/api/v1/quick-add', { body: { input: trimmed } });
      onClose();
      onQuickAddSuccess(res.message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const actions: PaletteItem[] = [
    { id: 'new-task', group: 'Neu', label: 'Aufgabe', hint: 'Q', icon: icon(PlusCircle), run: run(() => onOpenTask(null)) },
    { id: 'new-tx', group: 'Neu', label: 'Buchung', hint: 'T', icon: icon(CreditCard), run: run(onOpenTransaction) },
    { id: 'new-pot', group: 'Neu', label: 'Spartopf', icon: icon(PiggyBank), run: run(onOpenCreatePot) },
    { id: 'new-reminder', group: 'Neu', label: 'Erinnerung', icon: icon(Bell), run: run(() => onQuickCreate('reminder')) },
    { id: 'new-exam', group: 'Neu', label: 'Prüfung', icon: icon(GraduationCap), run: run(() => onQuickCreate('exam')) },
    { id: 'new-grade', group: 'Neu', label: 'Note', icon: icon(Award), run: run(() => onQuickCreate('grade')) },
    { id: 'new-shopping', group: 'Neu', label: 'Einkaufsliste', icon: icon(ShoppingCart), run: run(() => onQuickCreate('shopping')) },
    { id: 'new-skill', group: 'Neu', label: 'Skill (will ich lernen)', icon: icon(Rocket), run: run(() => onQuickCreate('skill')) },
    ...MODE_ORDER.map((mode) => {
      const { label, Icon, shortcut } = MODE_META[mode];
      return { id: `mode-${mode}`, group: 'Gehe zu', label, hint: shortcut, icon: icon(Icon), run: run(() => setActiveMode(mode)) };
    }),
    { id: 'untis', group: 'Einstellungen', label: 'WebUntis synchronisieren', hint: 'U', icon: icon(RefreshCw), run: run(onOpenUntis) },
    { id: 'calendar', group: 'Einstellungen', label: 'Kalender abonnieren', icon: icon(CalendarPlus), run: run(onOpenAppleSync) },
    { id: 'settings', group: 'Einstellungen', label: 'Einstellungen', hint: 'S', icon: icon(Settings), run: run(onOpenSettings) },
  ];

  const items: PaletteItem[] = [];
  if (!needle) {
    items.push(...actions);
  } else {
    if (intent) {
      items.push({
        id: 'quick-add',
        group: 'Eintragen',
        label: describeIntent(intent),
        hint: '↵',
        icon: <Sparkles className="h-[18px] w-[18px] text-accent" />,
        run: submitQuickAdd,
      });
    }
    tasks
      .filter((t) => t.title.toLowerCase().includes(needle) || t.subject?.name.toLowerCase().includes(needle))
      .slice(0, 5)
      .forEach((t) =>
        items.push({
          id: `task-${t.id}`,
          group: 'Aufgaben',
          label: `${t.status === 'done' ? '✓ ' : ''}${t.title}`,
          hint: relativeDayLabel(new Date(t.dueDate)),
          icon: icon(BookOpen),
          run: run(() => onOpenTask(t)),
        })
      );
    notes
      .filter((n) => n.title.toLowerCase().includes(needle) || n.content.toLowerCase().includes(needle))
      .slice(0, 5)
      .forEach((n) =>
        items.push({ id: `note-${n.id}`, group: 'Notizen', label: n.title || 'Ohne Titel', icon: icon(NotebookPen), run: run(() => onOpenNote(n.id)) })
      );
    reminders
      .filter((r) => !r.isDone && `${r.title} ${r.personName ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 3)
      .forEach((r) =>
        items.push({
          id: `reminder-${r.id}`,
          group: 'Erinnerungen',
          label: r.personName ? `${r.personName}: ${r.title}` : r.title,
          icon: icon(Bell),
          run: run(() => setActiveMode('all')),
        })
      );
    items.push(...actions.filter((a) => a.label.toLowerCase().includes(needle)));
  }

  const safeIndex = Math.min(activeIndex, Math.max(0, items.length - 1));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((safeIndex + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((safeIndex - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[safeIndex]?.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgb(6_12_26/0.5)] p-3 pt-[8vh] backdrop-blur-[3px] animate-in sm:p-4 sm:pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Suchen oder eintragen"
        className="w-full max-w-xl overflow-hidden rounded-[16px] border border-line/10 bg-sheet shadow-lift animate-in slide-up"
      >
        <div className="flex items-center gap-3 border-b border-line/10 px-4">
          <Search className="h-5 w-5 flex-shrink-0 text-ink-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
              setError(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Suchen – oder „Mathe HÜ bis Fr“, „4,50 € Bäcker“"
            className="h-14 w-full bg-transparent text-[17px] text-ink placeholder:text-ink-3 focus:outline-none"
            aria-label="Suchen oder eintragen"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} className="icon-btn h-8 w-8" aria-label="Eingabe leeren">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden rounded border border-line/15 bg-inset px-1.5 py-0.5 font-mono text-[11px] text-ink-3 sm:inline">Esc</kbd>
          )}
        </div>

        {intent && (
          <div className="flex items-center justify-between gap-3 border-b border-line/10 bg-inset px-4 py-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px]">
              {intent.type === 'task' && (
                <>
                  <span className="font-bold text-ink">{intent.title}</span>
                  {intent.subjectName && <span className="chip">{intent.subjectName}</span>}
                  <span className="chip font-mono">
                    {relativeDayLabel(new Date(intent.dueDate))} {format(new Date(intent.dueDate), 'HH:mm', { locale: de })}
                  </span>
                  <span className="chip font-mono">{intent.estimatedMinutes} min</span>
                  <span className="chip">{PRIORITY_LABEL[intent.priority]}</span>
                </>
              )}
              {intent.type === 'transaction' && (
                <>
                  <span className={`font-mono font-semibold ${intent.txType === 'income' ? 'text-leaf' : 'text-ink'}`}>
                    {intent.txType === 'income' ? '+' : '−'}
                    {intent.amount.toFixed(2)} €
                  </span>
                  <span className="font-bold text-ink">{intent.title}</span>
                  <span className="chip">{intent.category}</span>
                </>
              )}
              {intent.type === 'deposit' && (
                <span className="font-bold text-ink">
                  +{intent.amount.toFixed(2)} € {intent.potName ? `→ ${intent.potName}` : '→ Spartopf'}
                </span>
              )}
            </div>
            <button type="button" onClick={submitQuickAdd} disabled={loading} className="btn-primary h-8 flex-shrink-0 px-3 text-[13px]">
              {loading ? 'Speichert…' : 'Eintragen'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {error && <p className="border-b border-pen/20 bg-pen/10 px-4 py-2 text-[13px] font-bold text-pen">{error}</p>}

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto overscroll-contain p-2" role="listbox">
          {items.length === 0 && <p className="px-3 py-6 text-center text-[14px] text-ink-3">Keine Treffer</p>}
          {items.map((item, idx) => {
            const showGroup = idx === 0 || items[idx - 1].group !== item.group;
            const active = idx === safeIndex;
            return (
              <React.Fragment key={item.id}>
                {showGroup && <div className="eyebrow px-3 pb-1 pt-3 text-[11px]">{item.group}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-active={active}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.run}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[10px] px-3 text-left text-[15px] ${
                    active ? 'bg-inset text-ink' : 'text-ink-2'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {item.icon}
                    <span className="truncate font-bold">{item.label}</span>
                  </span>
                  {item.hint && <span className="flex-shrink-0 font-mono text-[12px] text-ink-3">{item.hint}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
