'use client';

import React, { useState, useEffect } from 'react';
import { 
  DashboardSummary, 
  Task, 
  SavingsPot, 
  Transaction, 
  ScheduleBlock, 
  Subject, 
  Reminder,
  Note,
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
import { RemindersHub } from './reminders/RemindersHub';
import { WebUntisModal } from './webuntis/WebUntisModal';
import { AppleSyncModal } from './calendar/AppleSyncModal';
import { NotesHub } from './notes/NotesHub';
import { SettingsModal } from './settings/SettingsModal';
import { 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  GraduationCap, 
  Wallet, 
  Coffee, 
  CalendarDays,
  ShieldCheck,
  Zap,
  Bell,
  School,
  FileText
} from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';

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
  const [isUntisModalOpen, setIsUntisModalOpen] = useState(false);
  const [isAppleSyncOpen, setIsAppleSyncOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPotForDeposit, setSelectedPotForDeposit] = useState<SavingsPot | null>(null);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setIsCreateTaskOpen(true);
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setIsUntisModalOpen(true);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsSettingsOpen(true);
      } else if (e.key === '1') {
        setActiveMode('all');
      } else if (e.key === '2') {
        setActiveMode('notes');
      } else if (e.key === '3') {
        setActiveMode('study');
      } else if (e.key === '4') {
        setActiveMode('wealth');
      } else if (e.key === '5') {
        setActiveMode('weekend');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Refresh summary data
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
    
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ),
      schedule: prev.schedule.map((block) => ({
        ...block,
        tasks: block.tasks
          ? block.tasks.map((t) =>
              t.id === task.id ? { ...t, status: newStatus } : t
            )
          : [],
      })),
    }));

    try {
      await fetch(`/api/v1/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Error toggling task:', err);
      refreshSummary();
    }
  };

  // Optimistic Task Delete
  const handleDeleteTask = async (taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
      schedule: prev.schedule.map((block) => ({
        ...block,
        tasks: block.tasks ? block.tasks.filter((t) => t.id !== taskId) : [],
      })),
    }));

    try {
      await fetch(`/api/v1/tasks/${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting task:', err);
      refreshSummary();
    }
  };

  // Reminder Actions
  const handleToggleReminder = async (reminder: Reminder) => {
    const newDone = !reminder.isDone;
    setData((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === reminder.id ? { ...r, isDone: newDone } : r
      ),
    }));

    try {
      await fetch(`/api/v1/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone: newDone }),
      });
    } catch (err) {
      console.error(err);
      refreshSummary();
    }
  };

  const handleDeleteReminder = async (id: string) => {
    setData((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));

    try {
      await fetch(`/api/v1/reminders/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
      refreshSummary();
    }
  };

  const handleAddReminder = async (remData: Partial<Reminder>) => {
    try {
      const res = await fetch('/api/v1/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(remData),
      });
      if (res.ok) {
        const created = await res.json();
        setData((prev) => ({
          ...prev,
          reminders: [created, ...prev.reminders],
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Note Actions
  const handleAddNote = async (newNote: Partial<Note>): Promise<Note | void> => {
    try {
      const res = await fetch('/api/v1/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote),
      });
      if (res.ok) {
        const created = await res.json();
        setData((prev) => ({
          ...prev,
          notes: [created, ...prev.notes],
        }));
        return created;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    setData((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));

    try {
      await fetch(`/api/v1/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    setData((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));

    try {
      await fetch(`/api/v1/notes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
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

  const handleUntisSyncCompleted = () => {
    refreshSummary();
  };

  const pendingReminders = data.reminders ? data.reminders.filter((r) => !r.isDone) : [];

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F8FAFC] pb-24 md:pb-12 selection:bg-indigo-500/30">
      {/* Top Header */}
      <TopBar
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenQuickAdd={() => setIsCreateTaskOpen(true)}
        onOpenUntisModal={() => setIsUntisModalOpen(true)}
        onOpenAppleSyncModal={() => setIsAppleSyncOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        displayName={data.user?.displayName || 'Alexander'}
        untisConfig={data.untisConfig}
        pendingRemindersCount={pendingReminders.length}
        notesCount={data.notes ? data.notes.length : 0}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        
        {/* Dynamic Status Pill */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3 bg-[#11141D]/90 border border-white/[0.07] px-4 py-2.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-muted flex-wrap">
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
            <span className="text-white/20">•</span>
            <span className="text-amber-300 font-medium flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {pendingReminders.length} Erinnerungen
            </span>
            <span className="text-white/20 hidden sm:inline">•</span>
            <button
              onClick={() => setIsAppleSyncOpen(true)}
              className="text-indigo-300 hover:text-indigo-200 font-medium hidden sm:inline flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Apple Sync aktiv
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted text-[11px] hidden md:inline">
              Ansicht:
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-indigo-300 capitalize flex items-center gap-1">
              <Zap className="h-3 w-3 text-indigo-400" />
              {activeMode === 'all'
                ? 'Dashboard'
                : activeMode === 'notes'
                ? 'Gedanken & Notizen'
                : activeMode === 'study'
                ? 'Deep Study'
                : activeMode === 'wealth'
                ? 'Wealth & Budget'
                : 'Weekend Chill'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WORKSPACE MODE 0: NOTIZEN & GEDANKEN (Apple Notes / Notion Style)         */}
        {/* ========================================================================= */}
        {activeMode === 'notes' && (
          <NotesHub
            notes={data.notes || []}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
          />
        )}

        {/* ========================================================================= */}
        {/* WORKSPACE MODE 1: ALL-IN-ONE                                              */}
        {/* ========================================================================= */}
        {activeMode === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
            {/* ZONE 1: FOKUS, STUNDENPLAN & KALENDER (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              <TimetableSchedule
                schedule={data.schedule}
                subjects={data.subjects}
                onToggleTaskStatus={handleToggleTaskStatus}
                onOpenUntisModal={() => setIsUntisModalOpen(true)}
                onOpenCreateTask={(subjId) => {
                  setSelectedSubjectId(subjId || null);
                  setIsCreateTaskOpen(true);
                }}
              />

              <MiniCalendar
                subjects={data.subjects}
                selectedSubjectId={selectedSubjectId}
                onSelectSubject={setSelectedSubjectId}
                tasks={data.tasks}
                reminders={data.reminders}
              />
            </div>

            {/* ZONE 2: HAUSAUFGABEN & ALLTAGS-ERINNERUNGEN (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <TaskMatrix
                tasks={data.tasks}
                selectedSubjectId={selectedSubjectId}
                onToggleStatus={handleToggleTaskStatus}
                onDeleteTask={handleDeleteTask}
                openCreateTaskModal={() => setIsCreateTaskOpen(true)}
              />

              {/* Reminders Hub */}
              <RemindersHub
                reminders={data.reminders || []}
                onToggleReminder={handleToggleReminder}
                onDeleteReminder={handleDeleteReminder}
                onAddReminder={handleAddReminder}
              />
            </div>

            {/* ZONE 3: WEALTH & GOALS (3 Cols) */}
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
        {/* WORKSPACE MODE 2: DEEP STUDY MODE                                         */}
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
                reminders={data.reminders}
              />
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-3xl bg-indigo-950/20 border border-indigo-500/30 p-4 flex items-center justify-between text-xs text-indigo-300">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-400" />
                  <span><strong>Deep Study Modus:</strong> Alle Finanzwidgets sind stummgeschaltet. Fokus auf Deadlines & Stundenplan.</span>
                </div>
                <button
                  onClick={() => setActiveMode('all')}
                  className="underline hover:text-white"
                >
                  Gesamtansicht
                </button>
              </div>

              <TimetableSchedule
                schedule={data.schedule}
                subjects={data.subjects}
                onToggleTaskStatus={handleToggleTaskStatus}
                onOpenUntisModal={() => setIsUntisModalOpen(true)}
                onOpenCreateTask={(subjId) => {
                  setSelectedSubjectId(subjId || null);
                  setIsCreateTaskOpen(true);
                }}
              />

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
        {/* WORKSPACE MODE 3: WEALTH & BUDGET MODE                                    */}
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
                  <span><strong>Wealth & Budget Modus:</strong> Schulkram ausgeblendet. Fokus auf Sparziele & Cashflow.</span>
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
        {/* WORKSPACE MODE 4: WEEKEND CHILL & ALLTAG                                  */}
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
                  Schul- und Uni-Aufgaben sind stummgeschaltet. Erledige entspannt deine Alltags-Erinnerungen wie Wäsche und genieße deine Freizeit!
                </p>
              </div>

              <RemindersHub
                reminders={data.reminders || []}
                onToggleReminder={handleToggleReminder}
                onDeleteReminder={handleDeleteReminder}
                onAddReminder={handleAddReminder}
              />
            </div>

            <div className="lg:col-span-6 space-y-6">
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
      <WebUntisModal
        isOpen={isUntisModalOpen}
        onClose={() => setIsUntisModalOpen(false)}
        config={data.untisConfig}
        onSyncCompleted={handleUntisSyncCompleted}
      />

      <AppleSyncModal
        isOpen={isAppleSyncOpen}
        onClose={() => setIsAppleSyncOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onQuickAddSuccess={() => refreshSummary()}
        setActiveMode={setActiveMode}
        openCreateTaskModal={() => setIsCreateTaskOpen(true)}
        openCreatePotModal={() => setIsCreatePotOpen(true)}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => {
          setIsCreateTaskOpen(false);
          setSelectedSubjectId(null);
        }}
        subjects={data.subjects}
        initialSubjectId={selectedSubjectId}
        onTaskCreated={() => {
          refreshSummary();
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
        onTransactionCreated={() => {
          refreshSummary();
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={data.user}
        untisConfig={data.untisConfig}
        subjects={data.subjects}
        onSettingsSaved={() => refreshSummary()}
        onOpenUntisModal={() => {
          setIsSettingsOpen(false);
          setIsUntisModalOpen(true);
        }}
        onOpenAppleSyncModal={() => {
          setIsSettingsOpen(false);
          setIsAppleSyncOpen(true);
        }}
      />
    </div>
  );
};
