'use client';

import React from 'react';
import type { WorkspaceMode } from '@/types';
import { Plus } from 'lucide-react';
import { MODE_META } from './modes';

interface MobileDockProps {
  activeMode: WorkspaceMode;
  setActiveMode: (mode: WorkspaceMode) => void;
  onOpenQuickAdd: () => void;
}

const LEFT: WorkspaceMode[] = ['all', 'study', 'life'];
const RIGHT: WorkspaceMode[] = ['wealth', 'skills', 'bible', 'notes'];

export const MobileDock: React.FC<MobileDockProps> = ({ activeMode, setActiveMode, onOpenQuickAdd }) => {
  const item = (mode: WorkspaceMode) => {
    const { label, Icon } = MODE_META[mode];
    const active = activeMode === mode;
    return (
      <button
        key={mode}
        type="button"
        onClick={() => setActiveMode(mode)}
        aria-current={active ? 'page' : undefined}
        className={`relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 text-[9.5px] font-bold leading-tight transition-colors ${
          active ? 'text-ink' : 'text-ink-3'
        }`}
      >
        {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-accent" aria-hidden />}
        <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.3 : 1.8} />
        {label}
      </button>
    );
  };

  return (
    <nav aria-label="Ansichten" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/10 bg-sheet/90 backdrop-blur-md lg:hidden">
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
  );
};
