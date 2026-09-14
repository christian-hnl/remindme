'use client';

import React from 'react';
import { WorkspaceMode } from '@/types';
import { Home, GraduationCap, Plus, Wallet, FileText, Command } from 'lucide-react';

interface MobileDockProps {
  activeMode: WorkspaceMode;
  setActiveMode: (mode: WorkspaceMode) => void;
  onOpenQuickAdd: () => void;
  onOpenCommand: () => void;
}

export const MobileDock: React.FC<MobileDockProps> = ({
  activeMode,
  setActiveMode,
  onOpenQuickAdd,
  onOpenCommand,
}) => {
  return (
    <div className="fixed bottom-3 inset-x-0 z-40 flex justify-center px-4 md:hidden pointer-events-none">
      <nav className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl glass-dock border border-white/10 shadow-2xl">
        <button
          onClick={() => setActiveMode('all')}
          className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl text-[10px] font-medium transition-all ${
            activeMode === 'all'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-muted hover:text-white'
          }`}
        >
          <Home className="h-4 w-4 mb-0.5" />
          <span>Heute</span>
        </button>

        <button
          onClick={() => setActiveMode('notes')}
          className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl text-[10px] font-medium transition-all ${
            activeMode === 'notes'
              ? 'bg-indigo-600/30 text-indigo-300 shadow-sm'
              : 'text-muted hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4 mb-0.5" />
          <span>Notizen</span>
        </button>

        {/* Center Prominent Quick-Add Button */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center justify-center h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/40 active:scale-90 transition-transform mx-1"
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
        </button>

        <button
          onClick={() => setActiveMode('study')}
          className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl text-[10px] font-medium transition-all ${
            activeMode === 'study'
              ? 'bg-indigo-600/30 text-indigo-300 shadow-sm'
              : 'text-muted hover:text-white'
          }`}
        >
          <GraduationCap className="h-4 w-4 mb-0.5" />
          <span>Study</span>
        </button>

        <button
          onClick={() => setActiveMode('wealth')}
          className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl text-[10px] font-medium transition-all ${
            activeMode === 'wealth'
              ? 'bg-emerald-600/30 text-emerald-300 shadow-sm'
              : 'text-muted hover:text-white'
          }`}
        >
          <Wallet className="h-4 w-4 mb-0.5" />
          <span>Geld</span>
        </button>
      </nav>
    </div>
  );
};
