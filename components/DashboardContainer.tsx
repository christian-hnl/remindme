'use client';

import React, { useState, useEffect } from 'react';
import { 
  DashboardSummary, 
  Task, 
  SavingsPot, 
  Transaction, 
  ScheduleBlock, 
  Subject, 
  WorkspaceMode 
} from '@/types';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { MobileDock } from './MobileDock';
import { TimetableSchedule } from './focus/TimetableSchedule';
import { MiniCalendar } from './focus/MiniCalendar';
import { PomodoroTimer } from './focus/PomodoroTimer';
import { TaskMatrix } from './tasks/TaskMatrix';
import { CreateTaskModal } from './tasks/CreateTaskModal';
import { SafeToSpendDial } from './wealth/SafeToSpendDial';
import { SavingsPotCard } from './wealth/SavingsPotCard';
import { CashflowRadar } from './wealth/CashflowRadar';
import { DepositModal } from './wealth/DepositModal';
import { CreatePotModal } from './wealth/CreatePotModal';
import { AddTransactionModal } from './wealth/AddTransactionModal';
import { 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  GraduationCap, 
  Wallet, 
  Coffee, 
  CalendarDays,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface DashboardContainerProps {
  initialData: DashboardSummary;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({ initialData }) => {
  const [data, setData] = useState<DashboardSummary>(initialData);
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Modals state
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreatePotOpen, setIsCreatePotOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [selectedPotForDeposit, setSelectedPotForDeposit] = useState<SavingsPot | null>(null);

  // Keyboard shortcut listener for 'Q' and 'Cmd+K'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setIsCreateTaskOpen(true);
      } else if (e.key === '1') {
        setActiveMode('all');
      } else if (e.key === '2') {
        setActiveMode('study');
      } else if (e.key === '3') {
        setActiveMode('wealth');
      } else if (e.key === '4') {
        setActiveMode('weekend');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Refresh summary data helper
  const refreshSummary = async () => {
    try {
      const res = await fetch('/api/v1/dashboard/summary');
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } catch (err) {
      console.error('Failed to refresh data', err);
    }
  };

  // Optimistic Task Status Toggle
  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'backlog' : 'done';
    
    // 0ms Optimistic UI update
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ),
    }));

    try {
      await fetch(`/api/v1/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Error toggling task:', err);
      refreshSummary(); // rollback on error
    }
  };

  // Optimistic Task Delete
  const handleDeleteTask = async (taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));

    try {
      await fetch(`/api/v1/tasks/${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting task:', err);
      refreshSummary();
    }
  };

  // Optimistic Savings Deposit
  const handleDepositToPot = async (potId: string, amount: number) => {
    setData((prev) => ({
      ...prev,
      savingsPots: prev.savingsPots.map((p) =>
        p.id === potId ? { ...p, currentAmount: p.currentAmount + amount } : p
      ),
      metrics: {
        ...prev.metrics,
        totalBalance: prev.metrics.totalBalance - amount,
      },
    }));

    try {
      await fetch(`/api/v1/savings-pots/${potId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      refreshSummary();
    } catch (err) {
      console.error('Error depositing to pot:', err);
      refreshSummary();
    }
  };

  // Quick Add NLP Success Callback
  const handleQuickAddSuccess = (result: any) => {
    refreshSummary();
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F8FAFC] pb-24 md:pb-12 selection:bg-indigo-500/30">
      {/* Top Header */}
      <TopBar
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenQuickAdd={() => setIsCreateTaskOpen(true)}
        displayName={data.user?.displayName || 'Alexander'}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        
        {/* Dynamic Status Pill (design.md Mobile & Desktop Hero Pill) */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3 bg-[#11141D]/90 border border-white/[0.07] px-4 py-2.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-muted">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-white font-medium">
              Noch <strong className="text-emerald-400 font-mono">{data.metrics.safeToSpendDaily.toFixed(2)} €</strong> heute frei
            </span>
            <span className="text-white/20">•</span>
            <span>
              {data.metrics.urgentTasksCount > 0
                ? `⚡ ${data.metrics.urgentTasksCount} dringende Deadlines`
                : '✅ Keine überfälligen Deadlines'}
            </span>
            <span className="text-white/20 hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              Nächste: <strong className="text-purple-300">Informatik Übung (12:00)</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted text-[11px] hidden md:inline">
              Aktiver Modus:
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-indigo-300 capitalize flex items-center gap-1">
              <Zap className="h-3 w-3 text-indigo-400" />
              {activeMode === 'all'
                ? 'All-in-One'
                : activeMode === 'study'
                ? 'Deep Study'
                : activeMode === 'wealth'
                ? 'Wealth & Budget'
                : 'Weekend Chill'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WORKSPACE MODE 1: ALL-IN-ONE (Standard 3-Zone Bento Dashboard)            */}
        {/* ========================================================================= */}
        {activeMode === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
            {/* ZONE 1: FOKUS & PLAN (25% / 3 Cols) */}
            <div className="lg:col-span-3 space-y-6">
              <MiniCalendar
                subjects={data.subjects}
                selectedSubjectId={selectedSubjectId}
                onSelectSubject={setSelectedSubjectId}
                tasks={data.tasks}
              />
              <TimetableSchedule schedule={data.schedule} />
            </div>

            {/* ZONE 2: WORKSPACE & AKTIONEN (50% / 6 Cols) */}
            <div className="lg:col-span-6 space-y-6">
              <TaskMatrix
                tasks={data.tasks}
                selectedSubjectId={selectedSubjectId}
                onToggleStatus={handleToggleTaskStatus}
                onDeleteTask={handleDeleteTask}
                openCreateTaskModal={() => setIsCreateTaskOpen(true)}
              />

              {/* Quick Transaction Overview embedded in middle column */}
              <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 shadow-bento">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Schnell-Buchung & Transaktionen</h3>
                  <button
                    onClick={() => setIsAddTxOpen(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    + Ausgabe eintragen
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {data.transactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="p-2 rounded-xl bg-[#161B26] border border-white/5">
                      <div className="text-white truncate font-medium">{tx.title}</div>
                      <div className={`font-mono text-[11px] mt-0.5 ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)} €
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ZONE 3: WEALTH & GOALS (25% / 3 Cols) */}
            <div className="lg:col-span-3 space-y-6">
              <SafeToSpendDial
                safeToSpendDaily={data.metrics.safeToSpendDaily}
                totalBalance={data.metrics.totalBalance}
                freeAvailable={420.0}
              />

              {/* Savings Pots Stack */}
              <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 shadow-bento">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Spartöpfe</h3>
                      <p className="text-[11px] text-muted">Copilot Visual Rings</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreatePotOpen(true)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                    title="Neuen Spartopf anlegen"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {data.savingsPots.map((pot) => (
                    <SavingsPotCard
                      key={pot.id}
                      pot={pot}
                      onDeposit={handleDepositToPot}
                      onOpenDetails={(p) => setSelectedPotForDeposit(p)}
                    />
                  ))}
                </div>
              </div>

              <CashflowRadar
                transactions={data.transactions}
                monthlySavingsRate={data.metrics.monthlySavingsRate}
                fixedCostsCovered={data.metrics.fixedCostsCovered}
                onAddTransactionClick={() => setIsAddTxOpen(true)}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WORKSPACE MODE 2: DEEP STUDY MODE (Laser Focus on Tasks & Pomodoro)       */}
        {/* ========================================================================= */}
        {activeMode === 'study' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
            <div className="lg:col-span-4 space-y-6">
              <PomodoroTimer />
              <MiniCalendar
                subjects={data.subjects}
                selectedSubjectId={selectedSubjectId}
                onSelectSubject={setSelectedSubjectId}
                tasks={data.tasks}
              />
              <TimetableSchedule schedule={data.schedule} />
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-3xl bg-indigo-950/20 border border-indigo-500/30 p-4 flex items-center justify-between text-xs text-indigo-300">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-400" />
                  <span><strong>Deep Study Modus aktiv:</strong> Alle Finanz-Widgets & Shopping-Spartöpfe sind stummgeschaltet.</span>
                </div>
                <button
                  onClick={() => setActiveMode('all')}
                  className="underline hover:text-white"
                >
                  Zurück zur Gesamtansicht
                </button>
              </div>

              <TaskMatrix
                tasks={data.tasks}
                selectedSubjectId={selectedSubjectId}
                onToggleStatus={handleToggleTaskStatus}
                onDeleteTask={handleDeleteTask}
                openCreateTaskModal={() => setIsCreateTaskOpen(true)}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WORKSPACE MODE 3: WEALTH & BUDGET MODE (Laser Focus on Finances)          */}
        {/* ========================================================================= */}
        {activeMode === 'wealth' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
            <div className="lg:col-span-5 space-y-6">
              <SafeToSpendDial
                safeToSpendDaily={data.metrics.safeToSpendDaily}
                totalBalance={data.metrics.totalBalance}
                freeAvailable={420.0}
              />
              <CashflowRadar
                transactions={data.transactions}
                monthlySavingsRate={data.metrics.monthlySavingsRate}
                fixedCostsCovered={data.metrics.fixedCostsCovered}
                onAddTransactionClick={() => setIsAddTxOpen(true)}
              />
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-3xl bg-emerald-950/20 border border-emerald-500/30 p-4 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  <span><strong>Wealth & Budget Modus aktiv:</strong> Uni-Aufgaben ausgeblendet. Fokus auf Sparziele & Cashflow.</span>
                </div>
                <button
                  onClick={() => setIsCreatePotOpen(true)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium"
                >
                  + Neuer Spartopf
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.savingsPots.map((pot) => (
                  <SavingsPotCard
                    key={pot.id}
                    pot={pot}
                    onDeposit={handleDepositToPot}
                    onOpenDetails={(p) => setSelectedPotForDeposit(p)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WORKSPACE MODE 4: WEEKEND CHILL MODE (Relaxation & Habits)               */}
        {/* ========================================================================= */}
        {activeMode === 'weekend' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-3xl bg-purple-950/20 border border-purple-500/30 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Coffee className="h-6 w-6 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Wochenende & Regeneration</h2>
                </div>
                <p className="text-xs text-purple-200/80 leading-relaxed">
                  Schul- und Uni-Aufgaben sind standardmäßig stummgeschaltet. Genieße deine freie Zeit, pflege Hobbys und verfolge deine Freizeit-Spartöpfe!
                </p>
              </div>

              <SafeToSpendDial
                safeToSpendDaily={data.metrics.safeToSpendDaily}
                totalBalance={data.metrics.totalBalance}
                freeAvailable={420.0}
              />
            </div>

            <div className="lg:col-span-6 space-y-6">
              <TimetableSchedule schedule={data.schedule} />
              <CashflowRadar
                transactions={data.transactions}
                monthlySavingsRate={data.metrics.monthlySavingsRate}
                fixedCostsCovered={data.metrics.fixedCostsCovered}
                onAddTransactionClick={() => setIsAddTxOpen(true)}
              />
            </div>
          </div>
        )}

      </main>

      {/* Mobile Floating Glass Dock */}
      <MobileDock
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        onOpenQuickAdd={() => setIsCreateTaskOpen(true)}
        onOpenCommand={() => setIsCommandOpen(true)}
      />

      {/* Global Modals */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onQuickAddSuccess={handleQuickAddSuccess}
        setActiveMode={setActiveMode}
        openCreateTaskModal={() => setIsCreateTaskOpen(true)}
        openCreatePotModal={() => setIsCreatePotOpen(true)}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        subjects={data.subjects}
        onTaskCreated={(newTask) => {
          setData((prev) => ({
            ...prev,
            tasks: [newTask, ...prev.tasks],
          }));
        }}
      />

      <CreatePotModal
        isOpen={isCreatePotOpen}
        onClose={() => setIsCreatePotOpen(false)}
        onPotCreated={(newPot) => {
          setData((prev) => ({
            ...prev,
            savingsPots: [newPot, ...prev.savingsPots],
          }));
        }}
      />

      <DepositModal
        isOpen={!!selectedPotForDeposit}
        onClose={() => setSelectedPotForDeposit(null)}
        pot={selectedPotForDeposit}
        onDepositSuccess={handleDepositToPot}
      />

      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onTransactionCreated={(newTx) => {
          setData((prev) => ({
            ...prev,
            transactions: [newTx, ...prev.transactions],
          }));
          refreshSummary();
        }}
      />
    </div>
  );
};
