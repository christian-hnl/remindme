'use client';

import React, { useEffect, useState } from 'react';
import type { WorkspaceMode } from '@/types';
import { LayoutGrid, Plus } from 'lucide-react';
import { MODE_META } from './modes';
import { sectionsFor } from './sections';

interface MobileDockProps {
  activeMode: WorkspaceMode;
  setActiveMode: (mode: WorkspaceMode) => void;
  onOpenQuickAdd: () => void;
  /** Focuses one card of a mode; null means "show everything again". */
  onOpenSection: (mode: WorkspaceMode, sectionId: string | null) => void;
  /** Card currently focused, so the fan-out can mark it. */
  focusedSection: string | null;
}

const LEFT: WorkspaceMode[] = ['all', 'study', 'life'];
const RIGHT: WorkspaceMode[] = ['wealth', 'skills', 'bible', 'notes'];

export const MobileDock: React.FC<MobileDockProps> = ({ activeMode, setActiveMode, onOpenQuickAdd, onOpenSection, focusedSection }) => {
  // Mode whose sections are fanned out above the bar – null while the bar is plain.
  const [fanned, setFanned] = useState<WorkspaceMode | null>(null);
  const sections = fanned ? sectionsFor(fanned) : [];

  useEffect(() => setFanned(null), [activeMode]);

  const press = (mode: WorkspaceMode) => {
    // A mode with several cards opens its list; tapping again closes it.
    if (sectionsFor(mode).length > 0 && (mode === activeMode || fanned === mode)) {
      setFanned(fanned === mode ? null : mode);
      if (mode !== activeMode) setActiveMode(mode);
      return;
    }
    setFanned(null);
    setActiveMode(mode);
  };

  const item = (mode: WorkspaceMode) => {
    const { label, Icon } = MODE_META[mode];
    const active = activeMode === mode;
    const hasSections = sectionsFor(mode).length > 0;
    return (
      <button
        key={mode}
        type="button"
        onClick={() => press(mode)}
        aria-current={active ? 'page' : undefined}
        aria-expanded={hasSections ? fanned === mode : undefined}
        className={`relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 text-[9.5px] font-bold leading-tight transition-colors ${
          active ? 'text-ink' : 'text-ink-3'
        }`}
      >
        {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-accent" aria-hidden />}
        <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.3 : 1.8} />
        {label}
        {hasSections && active && <span className="absolute bottom-1 h-[3px] w-[3px] rounded-full bg-ink-3" aria-hidden />}
      </button>
    );
  };

  return (
    <>
      {fanned && (
        <button
          type="button"
          aria-label="Bereiche schließen"
          onClick={() => setFanned(null)}
          className="animate-in fixed inset-0 z-30 bg-paper/70 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <nav aria-label="Ansichten" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/10 bg-sheet/90 backdrop-blur-md lg:hidden">
        {sections.length > 0 && (
          <div className="border-b border-line/10 px-3 pb-2.5 pt-2.5">
            <p className="eyebrow mb-2">{MODE_META[fanned!].label}</p>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onOpenSection(fanned!, null);
                  setFanned(null);
                }}
                aria-pressed={focusedSection === null}
                className="fan-in flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-[11px] border border-line/10 bg-inset px-1 text-[10px] font-bold text-ink-2 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-sheet"
              >
                <LayoutGrid className="h-4 w-4" />
                Übersicht
              </button>
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onOpenSection(fanned!, s.id);
                    setFanned(null);
                  }}
                  aria-pressed={focusedSection === s.id}
                  style={{ animationDelay: `${(i + 1) * 28}ms` }}
                  className="fan-in flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-[11px] border border-line/10 bg-inset px-1 text-center text-[10px] font-bold leading-tight text-ink-2 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-sheet"
                >
                  <s.Icon className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto grid max-w-lg grid-cols-8 items-center px-0.5">
          {LEFT.map(item)}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onOpenQuickAdd}
              aria-label="Neu anlegen"
              className="-mt-6 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-on-accent shadow-lift ring-[5px] ring-paper transition-transform active:scale-90"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>
          {RIGHT.map(item)}
        </div>
      </nav>
    </>
  );
};
