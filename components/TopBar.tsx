'use client';

import React, { useEffect, useState } from 'react';
import type { WorkspaceMode } from '@/types';
import { CalendarPlus, Plus, Search, Settings } from 'lucide-react';
import { ThemeToggle } from './ui/ThemeToggle';
import { MODE_META, MODE_ORDER } from './modes';

interface TopBarProps {
  activeMode: WorkspaceMode;
  setActiveMode: (mode: WorkspaceMode) => void;
  onOpenCommand: () => void;
  onOpenQuickAdd: () => void;
  onOpenAppleSyncModal: () => void;
  onOpenSettingsModal: () => void;
  notesCount?: number;
}

export function Logo() {
  return (
    <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-ink font-display text-[17px] font-bold tracking-tight text-sheet">
      LT
      <span className="absolute inset-x-2 bottom-[7px] h-[3px] rounded-full bg-marker" aria-hidden />
    </span>
  );
}

export const TopBar: React.FC<TopBarProps> = ({
  activeMode,
  setActiveMode,
  onOpenCommand,
  onOpenQuickAdd,
  onOpenAppleSyncModal,
  onOpenSettingsModal,
  notesCount = 0,
}) => {
  const [shortcut, setShortcut] = useState('Strg K');
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut('⌘K');
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line/10 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 sm:px-6 lg:h-16 lg:px-8">
        <button
          type="button"
          onClick={() => setActiveMode('all')}
          className="flex items-center gap-2.5 rounded-[10px] pr-1"
          aria-label="Zur Heute-Ansicht"
        >
          <Logo />
          <span className="hidden font-display text-[22px] font-bold tracking-tight text-ink sm:inline">LifeTracker</span>
        </button>

        {/* Current view on phones & tablets (desktop shows the tab bar) */}
        <span className="truncate font-display text-[20px] font-semibold text-ink-2 lg:hidden">
          <span className="mx-1.5 text-line/30 sm:mx-2" aria-hidden>
            /
          </span>
          {MODE_META[activeMode].label}
        </span>

        <nav className="ml-6 hidden h-full items-stretch gap-1 lg:flex" aria-label="Ansichten">
          {MODE_ORDER.map((mode) => {
            const { label, shortcut: key } = MODE_META[mode];
            const active = activeMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveMode(mode)}
                aria-current={active ? 'page' : undefined}
                title={`${label} (${key})`}
                className={`relative flex items-center gap-1.5 px-3 font-display text-[17px] font-semibold tracking-[0.01em] transition-colors ${
                  active ? 'text-ink' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {label}
                {mode === 'notes' && notesCount > 0 && (
                  <span className="font-mono text-[11px] font-medium text-ink-3">{notesCount}</span>
                )}
                {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-accent" aria-hidden />}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {/* Wide search field only where there is room next to the tabs (md without tabs, xl with tabs) */}
          <button
            type="button"
            onClick={onOpenCommand}
            className="mr-1 hidden h-10 w-60 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-line/15 bg-sheet px-3 text-[14px] text-ink-3 transition-colors hover:border-line/30 md:flex lg:hidden xl:flex xl:w-72"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span>Suchen oder eintragen…</span>
            <kbd className="ml-auto rounded border border-line/15 bg-inset px-1.5 py-0.5 font-mono text-[11px] text-ink-3">
              {shortcut}
            </kbd>
          </button>
          <button
            type="button"
            onClick={onOpenCommand}
            className="icon-btn md:hidden lg:inline-flex xl:hidden"
            aria-label="Suchen oder eintragen"
            title={`Suchen oder eintragen (${shortcut})`}
          >
            <Search className="h-[19px] w-[19px]" />
          </button>
          <button
            type="button"
            onClick={onOpenAppleSyncModal}
            className="icon-btn hidden sm:inline-flex lg:hidden xl:inline-flex"
            aria-label="Kalender abonnieren"
            title="Kalender abonnieren"
          >
            <CalendarPlus className="h-[19px] w-[19px]" />
          </button>
          <ThemeToggle />
          <button type="button" onClick={onOpenSettingsModal} className="icon-btn" aria-label="Einstellungen" title="Einstellungen (S)">
            <Settings className="h-[19px] w-[19px]" />
          </button>
          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="btn-primary ml-2 hidden w-10 px-0 lg:inline-flex xl:w-auto xl:px-4"
            title="Neu anlegen (N)"
            aria-label="Neu anlegen"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden xl:inline">Neu</span>
          </button>
        </div>
      </div>
    </header>
  );
};
