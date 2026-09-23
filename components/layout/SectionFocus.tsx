'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { WorkspaceMode } from '@/types';
import { sectionMeta, sectionsFor } from '@/components/sections';

/** idle = every card, closing = the others fly out, focused = only the chosen card. */
type Phase = 'idle' | 'closing' | 'focused';

export interface FocusValue {
  focusId: string | null;
  phase: Phase;
  open: (id: string) => void;
  close: () => void;
}

const FocusContext = createContext<FocusValue>({ focusId: null, phase: 'idle', open: () => {}, close: () => {} });

export const useSectionFocus = () => useContext(FocusContext);

/** How long the fly-out runs – keep in sync with .fly-out in globals.css. */
const FLY_OUT_MS = 200;

/** Focus state lives in the dashboard so the dock can drive it as well. */
export function useFocusState(mode: WorkspaceMode): FocusValue {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const close = useCallback(() => {
    clearTimer();
    setFocusId(null);
    setPhase('idle');
  }, []);

  const open = useCallback(
    (id: string) => {
      clearTimer();
      setFocusId(id);
      // Let the other cards leave first, then swap to the single-card view.
      setPhase('closing');
      timer.current = setTimeout(() => setPhase('focused'), FLY_OUT_MS);
    },
    []
  );

  // Switching the mode leaves the focused card behind – its section no longer exists.
  useEffect(() => close(), [mode, close]);
  useEffect(() => clearTimer, []);

  useEffect(() => {
    if (!focusId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusId, close]);

  return useMemo(() => ({ focusId, phase, open, close }), [focusId, phase, open, close]);
}

export const SectionFocusProvider: React.FC<{ value: FocusValue; children: React.ReactNode }> = ({ value, children }) => (
  <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
);

/**
 * Wraps one card. While another card is focused it renders nothing, so the layout
 * collapses to the single card the user asked for.
 */
export const Section: React.FC<{ id: string; className?: string; children: React.ReactNode }> = ({ id, className = '', children }) => {
  const { focusId, phase } = useSectionFocus();
  if (phase === 'focused' && focusId !== id) return null;
  const leaving = phase === 'closing' && focusId !== id;
  return (
    <div
      id={`section-${id}`}
      data-section={id}
      className={`min-w-0 ${className} ${leaving ? 'fly-out' : ''} ${phase === 'focused' ? 'zoom-in' : ''}`}
    >
      {children}
    </div>
  );
};

/** Header of the focused view – says where you are and gets you back out. */
export const FocusBar: React.FC<{ mode: WorkspaceMode }> = ({ mode }) => {
  const { focusId, phase, close } = useSectionFocus();
  if (phase !== 'focused' || !focusId) return null;
  const meta = sectionMeta(mode, focusId);
  return (
    <div className="mb-4 flex items-center gap-3">
      <button type="button" onClick={close} className="btn-secondary h-10 px-3" aria-label="Zurück zur Übersicht">
        <ArrowLeft className="h-4 w-4" /> Übersicht
      </button>
      {meta && (
        <p className="flex min-w-0 items-center gap-2 truncate font-display text-[20px] font-semibold text-ink">
          <meta.Icon className="h-[18px] w-[18px] flex-shrink-0 text-ink-3" />
          {meta.label}
        </p>
      )}
      <span className="ml-auto hidden text-[12px] text-ink-3 sm:block">Esc schließt</span>
    </div>
  );
};

/** Row of section chips – the desktop counterpart to the dock's fan-out. */
export const SectionTabs: React.FC<{ mode: WorkspaceMode }> = ({ mode }) => {
  const { focusId, phase, open, close } = useSectionFocus();
  const sections = sectionsFor(mode);
  if (sections.length === 0 || phase === 'focused') return null;
  return (
    <div className="scrollbar-none -mx-3 mb-4 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:px-0" role="group" aria-label="Bereiche">
      <button type="button" aria-pressed={focusId === null} onClick={close} className="tab h-8 px-3 text-[13px]">
        Alles
      </button>
      {sections.map((s) => (
        <button key={s.id} type="button" aria-pressed={focusId === s.id} onClick={() => open(s.id)} className="tab h-8 px-3 text-[13px]">
          <s.Icon className="h-3.5 w-3.5" />
          {s.label}
        </button>
      ))}
    </div>
  );
};
