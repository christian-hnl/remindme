'use client';

import React from 'react';
import { WorkspaceMode, WebUntisConfig } from '@/types';
import { 
  Command, 
  Plus, 
  GraduationCap, 
  Wallet, 
  Coffee, 
  LayoutGrid, 
  Sparkles,
  School,
  Calendar,
  FileText
} from 'lucide-react';

interface TopBarProps {
  activeMode: WorkspaceMode;
  setActiveMode: (mode: WorkspaceMode) => void;
  onOpenCommand: () => void;
  onOpenQuickAdd: () => void;
  onOpenUntisModal: () => void;
  onOpenAppleSyncModal: () => void;
  displayName: string;
  untisConfig: WebUntisConfig | null;
  pendingRemindersCount?: number;
  notesCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeMode,
  setActiveMode,
  onOpenCommand,
  onOpenQuickAdd,
  onOpenUntisModal,
  onOpenAppleSyncModal,
  displayName,
  untisConfig,
  pendingRemindersCount = 0,
  notesCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-[rgba(255,255,255,0.06)] bg-[#07090E]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* Brand & Integrations Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-tight">LifeTracker</span>
              
              {/* WebUntis live pill */}
              <button
                onClick={onOpenUntisModal}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                title="Klicken für WebUntis Konfiguration"
              >
                <School className="h-2.5 w-2.5 text-purple-400" />
                <span>{untisConfig?.schoolName || 'WebUntis'}</span>
              </button>

              {/* Apple Calendar Sync Pill */}
              <button
                onClick={onOpenAppleSyncModal}
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                title="Mit Apple Kalender abonnieren"
              >
                <Calendar className="h-2.5 w-2.5 text-indigo-400" />
                <span>Apple Sync</span>
              </button>
            </div>
            <p className="text-[11px] text-muted hidden md:block">
              WebUntis Stundenplan • Apple Kalender Live-Sync • Notizen & Gedanken
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="hidden lg:flex items-center gap-1 rounded-2xl bg-[#11141D] p-1 border border-[rgba(255,255,255,0.06)]">
          <button
            onClick={() => setActiveMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeMode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveMode('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeMode === 'notes'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-indigo-300" />
            <span>Notizen</span>
            {notesCount > 0 && (
              <span className="px-1 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                {notesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMode('study')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeMode === 'study'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5 text-indigo-300" />
            <span>Study</span>
          </button>

          <button
            onClick={() => setActiveMode('wealth')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeMode === 'wealth'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-300" />
            <span>Geld</span>
          </button>

          <button
            onClick={() => setActiveMode('weekend')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeMode === 'weekend'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <Coffee className="h-3.5 w-3.5 text-purple-300" />
            <span>Weekend</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Apple Sync Button for Mobile/Tablet */}
          <button
            onClick={onOpenAppleSyncModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#11141D] border border-white/[0.07] text-xs text-muted hover:text-white hover:border-indigo-500/30 transition-colors"
            title="Apple Kalender Live-Sync"
          >
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Apple Sync</span>
          </button>

          {/* Global Search Button */}
          <button
            id="command-palette-trigger"
            onClick={onOpenCommand}
            className="group flex items-center gap-2 rounded-xl bg-[#11141D] px-3 py-1.5 text-xs text-muted border border-[rgba(255,255,255,0.06)] hover:border-indigo-500/40 hover:text-white transition-all shadow-sm"
          >
            <Command className="h-3.5 w-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Suchen...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-[#1A1F2C] px-1.5 py-0.5 text-[10px] font-mono text-muted group-hover:text-white border border-white/5">
              ⌘K
            </kbd>
          </button>

          {/* Quick Add Button */}
          <button
            id="quick-add-btn"
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Neu</span>
            <kbd className="hidden md:inline text-[10px] opacity-75 font-mono">Q</kbd>
          </button>

          {/* User Status / Avatar */}
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1A1F2C] border border-white/10 text-xs font-semibold text-indigo-300">
              {displayName.charAt(0)}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
