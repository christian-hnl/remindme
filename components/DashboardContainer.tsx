'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type {
  BankAccountSummary,
  BankConnectionSummary,
  Birthday,
  DashboardSummary,
  Exam,
  Grade,
  Habit,
  Note,
  Reminder,
  SavingsPot,
  ShoppingItem,
  Skill,
  Task,
  WorkspaceMode,
} from '@/types';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { MobileDock } from './MobileDock';
import { MODE_META, MODE_ORDER } from './modes';
import { TodayRuler } from './focus/TodayRuler';
import { TimetableSchedule } from './focus/TimetableSchedule';
import { MiniCalendar } from './focus/MiniCalendar';
import { PomodoroTimer } from './focus/PomodoroTimer';
import { UpcomingCard } from './focus/UpcomingCard';
import { TaskMatrix } from './tasks/TaskMatrix';
import { TaskModal } from './tasks/TaskModal';
import { ExamsCard, type ExamPayload } from './school/ExamsCard';
import { GradesCard, type GradePayload } from './school/GradesCard';
import { ShoppingList } from './life/ShoppingList';
import { HabitsCard } from './life/HabitsCard';
import { BirthdaysCard, type BirthdayPayload } from './life/BirthdaysCard';
import { SafeToSpendDial } from './wealth/SafeToSpendDial';
import { SavingsPotCard } from './wealth/SavingsPotCard';
import { CashflowRadar } from './wealth/CashflowRadar';
import { WalletCard } from './wealth/WalletCard';
import { BankAccountsCard } from './wealth/BankAccountsCard';
import { ImportModal } from './wealth/ImportModal';
import { FinanceAnalysis, type TransactionFilter } from './wealth/FinanceAnalysis';
import { TransactionsBrowser } from './wealth/TransactionsBrowser';
import { TransactionEditModal, type EditableTransaction } from './wealth/TransactionEditModal';
import { SkillsHub } from './skills/SkillsHub';
import { PotDetailsModal } from './wealth/PotDetailsModal';
import { CreatePotModal } from './wealth/CreatePotModal';
import { AddTransactionModal } from './wealth/AddTransactionModal';
import { RemindersHub } from './reminders/RemindersHub';
import { WebUntisModal } from './webuntis/WebUntisModal';
import { AppleSyncModal } from './calendar/AppleSyncModal';
import { NotesHub } from './notes/NotesHub';
import { SettingsModal, type SettingsTab } from './settings/SettingsModal';
import { ToastProvider, useToast } from './ui/Toast';
import { QuickCreateSheet, type QuickKind } from './ui/QuickCreateSheet';
import { BarChart3, Bell, GraduationCap, LayoutGrid, ListOrdered, PiggyBank, Plus, Upload } from 'lucide-react';
import { fireMilestoneGlow } from '@/lib/confetti';
import { api, errorMessage } from '@/lib/client';
import { formatEuro, relativeDayLabel } from '@/lib/format';
import { GRADE_NAMES } from '@/lib/school';

interface DashboardContainerProps {
  initialData: DashboardSummary;
}

const MODE_STORAGE_KEY = 'lifetracker:mode';
const BANK_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

type TaskModalState = { task: Task | null; subjectId: string | null } | null;
/** A form that should open once its view is on screen (from the "Neu" menu). */
type PendingRequest = { kind: 'reminder' | 'exam' | 'grade' | 'shopping' | 'birthday' | 'skill' | 'note'; prefill?: Partial<GradePayload> } | null;
type WealthView = 'overview' | 'analysis' | 'transactions';
const WEALTH_VIEW_KEY = 'lifetracker:wealth-view';

const WEALTH_VIEWS: { id: WealthView; label: string; Icon: typeof Plus }[] = [
  { id: 'overview', label: 'Überblick', Icon: LayoutGrid },
  { id: 'analysis', label: 'Analyse', Icon: BarChart3 },
  { id: 'transactions', label: 'Buchungen', Icon: ListOrdered },
];
type ListKey = 'exams' | 'grades' | 'shopping' | 'habits' | 'birthdays' | 'reminders' | 'notes' | 'transactions';

/** Applies a change to a task wherever it appears (task list and lessons); null removes it. */
function patchTask(data: DashboardSummary, id: string, patch: (task: Task) => Task | null): DashboardSummary {
  const apply = (list: Task[]) =>
    list.flatMap((t) => {
      if (t.id !== id) return [t];
      const next = patch(t);
      return next ? [next] : [];
    });
  return {
    ...data,
    tasks: apply(data.tasks),
    schedule: data.schedule.map((block) => (block.tasks ? { ...block, tasks: apply(block.tasks) } : block)),
  };
}

/** Replaces (by id) or removes an entry of one of the summary lists. */
function updateList<T extends { id: string }>(data: DashboardSummary, key: ListKey, id: string, next: T | null): DashboardSummary {
  const list = data[key] as unknown as T[];
  return { ...data, [key]: next ? list.map((item) => (item.id === id ? next : item)) : list.filter((item) => item.id !== id) } as DashboardSummary;
}

function prependList<T>(data: DashboardSummary, key: ListKey, item: T): DashboardSummary {
  return { ...data, [key]: [item, ...(data[key] as unknown as T[])] } as DashboardSummary;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({ initialData }) => (
  <ToastProvider>
    <Dashboard initialData={initialData} />
  </ToastProvider>
);

function ModeHeader({ mode, actions }: { mode: WorkspaceMode; actions?: React.ReactNode }) {
  return (
    <div className="rise mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        <p className="eyebrow">{format(new Date(), 'EEEE, d. MMMM', { locale: de })}</p>
        <h1 className="mt-1.5 font-display text-[42px] font-bold leading-none tracking-[-0.01em] text-ink sm:text-[54px]">{MODE_META[mode].label}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{MODE_META[mode].description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function Dashboard({ initialData }: DashboardContainerProps) {
  const toast = useToast();
  const [data, setData] = useState<DashboardSummary>(initialData);
  const [activeMode, setActiveModeState] = useState<WorkspaceMode>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialData.notes[0]?.id ?? null);

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [taskModal, setTaskModal] = useState<TaskModalState>(null);
  const [isCreatePotOpen, setIsCreatePotOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isUntisModalOpen, setIsUntisModalOpen] = useState(false);
  const [isAppleSyncOpen, setIsAppleSyncOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [detailsPotId, setDetailsPotId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRequest>(null);
  const [bankSyncing, setBankSyncing] = useState(false);
  const [wealthView, setWealthViewState] = useState<WealthView>('overview');
  const [txFilter, setTxFilter] = useState<TransactionFilter>({});
  const [editingTx, setEditingTx] = useState<EditableTransaction | null>(null);
  const [financeVersion, setFinanceVersion] = useState(0);

  const detailsPot = data.savingsPots.find((p) => p.id === detailsPotId) ?? null;
  const clearPending = useCallback(() => setPending(null), []);

  // ---------------------------------------------------------------- mode
  const setActiveMode = useCallback((mode: WorkspaceMode) => {
    setActiveModeState(mode);
    window.scrollTo({ top: 0 });
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODE_STORAGE_KEY);
      // "weekend" was replaced by "life".
      const mode = (stored === 'weekend' ? 'life' : stored) as WorkspaceMode | null;
      if (mode && MODE_ORDER.includes(mode)) setActiveModeState(mode);
    } catch {
      // Storage unavailable (private mode) – keep default.
    }
  }, []);

  const setWealthView = useCallback((view: WealthView) => {
    setWealthViewState(view);
    try {
      localStorage.setItem(WEALTH_VIEW_KEY, view);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WEALTH_VIEW_KEY) as WealthView | null;
      if (stored && WEALTH_VIEWS.some((v) => v.id === stored)) setWealthViewState(stored);
    } catch {
      // ignore
    }
  }, []);

  const openTransactions = useCallback(
    (filter: TransactionFilter) => {
      setTxFilter(filter);
      setActiveMode('wealth');
      setWealthView('transactions');
    },
    [setActiveMode, setWealthView]
  );

  const openSettings = useCallback((tab: SettingsTab = 'profile') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  }, []);

  const openNewTask = useCallback((subjectId?: string | null) => setTaskModal({ task: null, subjectId: subjectId ?? null }), []);
  const openEditTask = useCallback((task: Task) => setTaskModal({ task, subjectId: null }), []);

  // ---------------------------------------------------------------- data sync
  const refreshSummary = useCallback(async () => {
    setFinanceVersion((v) => v + 1);
    try {
      setData(await api<DashboardSummary>('/api/v1/dashboard/summary'));
    } catch (error) {
      toast(`Aktualisieren fehlgeschlagen: ${errorMessage(error)}`, 'error');
    }
  }, [toast]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshSummary();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshSummary]);

  /** Applies an optimistic update; on failure shows the error and reloads server state. */
  const optimistic = useCallback(
    async (update: (d: DashboardSummary) => DashboardSummary, request: () => Promise<unknown>, failure: string) => {
      setData(update);
      try {
        await request();
        return true;
      } catch (error) {
        toast(`${failure}: ${errorMessage(error)}`, 'error');
        await refreshSummary();
        return false;
      }
    },
    [toast, refreshSummary]
  );

  /** Runs a create/update request; shows a toast and rethrows so forms stay open on error. */
  const save = useCallback(
    async <T,>(request: () => Promise<T>, apply: (d: DashboardSummary, result: T) => DashboardSummary, success: (result: T) => string, failure: string) => {
      try {
        const result = await request();
        setData((d) => apply(d, result));
        toast(success(result));
        return result;
      } catch (error) {
        toast(`${failure}: ${errorMessage(error)}`, 'error');
        throw error;
      }
    },
    [toast]
  );

  // ---------------------------------------------------------------- quick create
  const quickCreate = useCallback(
    (kind: QuickKind) => {
      switch (kind) {
        case 'task':
          openNewTask(selectedSubjectId);
          break;
        case 'transaction':
          setIsAddTxOpen(true);
          break;
        case 'reminder':
          if (activeMode !== 'all' && activeMode !== 'life') setActiveMode('life');
          setPending({ kind });
          break;
        case 'exam':
        case 'grade':
          if (activeMode !== 'study') setActiveMode('study');
          setPending({ kind });
          break;
        case 'shopping':
        case 'birthday':
          if (activeMode !== 'life') setActiveMode('life');
          setPending({ kind });
          break;
        case 'skill':
          if (activeMode !== 'skills') setActiveMode('skills');
          setPending({ kind });
          break;
        case 'note':
          if (activeMode !== 'notes') setActiveMode('notes');
          setPending({ kind });
          break;
        case 'habit':
          if (activeMode !== 'life') setActiveMode('life');
          setTimeout(() => {
            const input = document.getElementById('habit-name');
            input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            input?.focus();
          }, 150);
          break;
      }
    },
    [activeMode, openNewTask, selectedSubjectId, setActiveMode]
  );

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (document.querySelector('[role="dialog"]')) return;

      const key = e.key.toLowerCase();
      const actions: Record<string, () => void> = {
        q: () => openNewTask(selectedSubjectId),
        n: () => setIsQuickOpen(true),
        t: () => setIsAddTxOpen(true),
        u: () => setIsUntisModalOpen(true),
        s: () => openSettings(),
        '/': () => setIsCommandOpen(true),
      };
      for (const mode of MODE_ORDER) actions[MODE_META[mode].shortcut] = () => setActiveMode(mode);
      if (actions[key]) {
        e.preventDefault();
        actions[key]();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openNewTask, openSettings, selectedSubjectId, setActiveMode]);

  // ---------------------------------------------------------------- tasks
  const handleToggleTaskStatus = useCallback(
    (task: Task) => {
      const status = task.status === 'done' ? 'backlog' : 'done';
      if (status === 'done') fireMilestoneGlow();
      optimistic(
        (d) => patchTask(d, task.id, (t) => ({ ...t, status, updatedAt: new Date().toISOString() })),
        () => api(`/api/v1/tasks/${task.id}`, { method: 'PATCH', body: { status } }),
        'Status konnte nicht geändert werden'
      );
    },
    [optimistic]
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      const ok = await optimistic((d) => patchTask(d, id, () => null), () => api(`/api/v1/tasks/${id}`, { method: 'DELETE' }), 'Aufgabe konnte nicht gelöscht werden');
      if (ok) toast('Aufgabe gelöscht');
    },
    [optimistic, toast]
  );

  const handleTaskSaved = useCallback(
    (task: Task, isNew: boolean) => {
      toast(isNew ? `„${task.title}“ angelegt` : 'Aufgabe gespeichert');
      refreshSummary();
    },
    [toast, refreshSummary]
  );

  // ---------------------------------------------------------------- reminders
  const handleToggleReminder = useCallback(
    async (reminder: Reminder) => {
      const isDone = !reminder.isDone;
      if (isDone) fireMilestoneGlow();
      setData((d) => updateList(d, 'reminders', reminder.id, { ...reminder, isDone }));
      try {
        const { rescheduled, ...updated } = await api<Reminder & { rescheduled?: boolean }>(`/api/v1/reminders/${reminder.id}`, {
          method: 'PATCH',
          body: { isDone },
        });
        setData((d) => updateList(d, 'reminders', reminder.id, updated));
        if (rescheduled && updated.dueDate) toast(`Wiederholt sich – nächstes Mal ${relativeDayLabel(new Date(updated.dueDate))}`, 'info');
      } catch (error) {
        toast(`Erinnerung konnte nicht aktualisiert werden: ${errorMessage(error)}`, 'error');
        refreshSummary();
      }
    },
    [toast, refreshSummary]
  );

  const handleDeleteReminder = useCallback(
    (id: string) =>
      optimistic((d) => updateList(d, 'reminders', id, null), () => api(`/api/v1/reminders/${id}`, { method: 'DELETE' }), 'Erinnerung konnte nicht gelöscht werden'),
    [optimistic]
  );

  const handleSaveReminder = useCallback(
    async (payload: Partial<Reminder>, id?: string) => {
      await save(
        () => api<Reminder & { rescheduled?: boolean }>(id ? `/api/v1/reminders/${id}` : '/api/v1/reminders', { method: id ? 'PATCH' : 'POST', body: payload }),
        (d, { rescheduled: _r, ...saved }) => (id ? updateList(d, 'reminders', id, saved) : prependList(d, 'reminders', saved)),
        (saved) => (id ? 'Erinnerung gespeichert' : `„${saved.title}“ hinzugefügt`),
        'Erinnerung konnte nicht gespeichert werden'
      );
    },
    [save]
  );

  // ---------------------------------------------------------------- notes
  const handleAddNote = useCallback(
    async (note: Partial<Note>) => {
      try {
        const created = await api<Note>('/api/v1/notes', { body: note });
        setData((d) => prependList(d, 'notes', created));
        setSelectedNoteId(created.id);
        return created;
      } catch (error) {
        toast(`Notiz konnte nicht erstellt werden: ${errorMessage(error)}`, 'error');
        return null;
      }
    },
    [toast]
  );

  const handleUpdateNote = useCallback(
    async (id: string, updates: Partial<Note>) => {
      setData((d) => ({ ...d, notes: d.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)) }));
      try {
        await api(`/api/v1/notes/${id}`, { method: 'PATCH', body: updates });
      } catch (error) {
        toast(`Notiz konnte nicht gespeichert werden: ${errorMessage(error)}`, 'error');
        throw error;
      }
    },
    [toast]
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      const remaining = data.notes.filter((n) => n.id !== id);
      setSelectedNoteId((current) => (current === id ? remaining[0]?.id ?? null : current));
      const ok = await optimistic((d) => updateList(d, 'notes', id, null), () => api(`/api/v1/notes/${id}`, { method: 'DELETE' }), 'Notiz konnte nicht gelöscht werden');
      if (ok) toast('Notiz gelöscht');
    },
    [data.notes, optimistic, toast]
  );

  const openNote = useCallback(
    (id: string) => {
      setSelectedNoteId(id);
      setActiveMode('notes');
    },
    [setActiveMode]
  );

  // ---------------------------------------------------------------- school
  const handleSaveExam = useCallback(
    async (payload: ExamPayload, id?: string) => {
      await save(
        () => api<Exam>(id ? `/api/v1/exams/${id}` : '/api/v1/exams', { method: id ? 'PATCH' : 'POST', body: payload }),
        (d, exam) => (id ? updateList(d, 'exams', id, exam) : prependList(d, 'exams', exam)),
        (exam) => (id ? 'Prüfung gespeichert' : `„${exam.title}“ eingetragen`),
        'Prüfung konnte nicht gespeichert werden'
      );
    },
    [save]
  );

  const handleToggleExamDone = useCallback(
    (exam: Exam) => {
      const isDone = !exam.isDone;
      optimistic(
        (d) => updateList(d, 'exams', exam.id, { ...exam, isDone }),
        () => api(`/api/v1/exams/${exam.id}`, { method: 'PATCH', body: { isDone } }),
        'Prüfung konnte nicht aktualisiert werden'
      ).then((ok) => ok && isDone && toast('Geschafft! Die Note kannst du unter „Vergangene“ eintragen.', 'info'));
    },
    [optimistic, toast]
  );

  const handleDeleteExam = useCallback(
    (id: string) => optimistic((d) => updateList(d, 'exams', id, null), () => api(`/api/v1/exams/${id}`, { method: 'DELETE' }), 'Prüfung konnte nicht gelöscht werden'),
    [optimistic]
  );

  const handleEnterGradeForExam = useCallback((exam: Exam) => {
    setPending({
      kind: 'grade',
      prefill: { subjectId: exam.subjectId ?? undefined, kind: exam.kind === 'schularbeit' ? 'schularbeit' : 'test', date: exam.date, title: exam.title },
    });
  }, []);

  const handleSaveGrade = useCallback(
    async (payload: GradePayload) => {
      await save(
        () => api<Grade>('/api/v1/grades', { body: payload }),
        (d, grade) => prependList(d, 'grades', grade),
        (grade) => `${GRADE_NAMES[Math.round(grade.value)] ?? grade.value} in ${grade.subject?.name ?? 'Fach'} eingetragen`,
        'Note konnte nicht gespeichert werden'
      );
    },
    [save]
  );

  const handleDeleteGrade = useCallback(
    (id: string) => optimistic((d) => updateList(d, 'grades', id, null), () => api(`/api/v1/grades/${id}`, { method: 'DELETE' }), 'Note konnte nicht gelöscht werden'),
    [optimistic]
  );

  // ---------------------------------------------------------------- everyday life
  const handleAddShopping = useCallback(
    async (name: string, quantity: string | null) => {
      try {
        const item = await api<ShoppingItem>('/api/v1/shopping', { body: { name, quantity } });
        setData((d) => prependList(d, 'shopping', item));
      } catch (error) {
        toast(`Konnte nicht hinzugefügt werden: ${errorMessage(error)}`, 'error');
        throw error;
      }
    },
    [toast]
  );

  const handleToggleShopping = useCallback(
    (item: ShoppingItem) => {
      const isDone = !item.isDone;
      optimistic(
        (d) => updateList(d, 'shopping', item.id, { ...item, isDone }),
        () => api(`/api/v1/shopping/${item.id}`, { method: 'PATCH', body: { isDone } }),
        'Eintrag konnte nicht aktualisiert werden'
      );
    },
    [optimistic]
  );

  const handleDeleteShopping = useCallback(
    (id: string) => optimistic((d) => updateList(d, 'shopping', id, null), () => api(`/api/v1/shopping/${id}`, { method: 'DELETE' }), 'Eintrag konnte nicht gelöscht werden'),
    [optimistic]
  );

  const handleClearShopping = useCallback(
    () =>
      optimistic((d) => ({ ...d, shopping: d.shopping.filter((i) => !i.isDone) }), () => api('/api/v1/shopping', { method: 'DELETE' }), 'Liste konnte nicht aufgeräumt werden'),
    [optimistic]
  );

  const handleAddHabit = useCallback(
    async (name: string, emoji: string) => {
      await save(
        () => api<Habit>('/api/v1/habits', { body: { name, emoji } }),
        (d, habit) => ({ ...d, habits: [...d.habits, habit] }),
        (habit) => `Routine „${habit.name}“ angelegt`,
        'Routine konnte nicht angelegt werden'
      );
    },
    [save]
  );

  const handleToggleHabitDay = useCallback(
    (habit: Habit, day: string) => {
      const done = !habit.days.includes(day);
      if (done && day === format(new Date(), 'yyyy-MM-dd')) fireMilestoneGlow();
      optimistic(
        (d) => updateList(d, 'habits', habit.id, { ...habit, days: done ? [...habit.days, day] : habit.days.filter((x) => x !== day) }),
        () => api(`/api/v1/habits/${habit.id}`, { method: 'PATCH', body: { day } }),
        'Routine konnte nicht aktualisiert werden'
      );
    },
    [optimistic]
  );

  const handleDeleteHabit = useCallback(
    (habit: Habit) =>
      optimistic((d) => updateList(d, 'habits', habit.id, null), () => api(`/api/v1/habits/${habit.id}`, { method: 'DELETE' }), 'Routine konnte nicht gelöscht werden'),
    [optimistic]
  );

  const handleAddBirthday = useCallback(
    async (payload: BirthdayPayload) => {
      await save(
        () => api<Birthday>('/api/v1/birthdays', { body: payload }),
        (d, birthday) => prependList(d, 'birthdays', birthday),
        (birthday) => `Geburtstag von ${birthday.name} gespeichert`,
        'Geburtstag konnte nicht gespeichert werden'
      );
    },
    [save]
  );

  const handleDeleteBirthday = useCallback(
    (id: string) => optimistic((d) => updateList(d, 'birthdays', id, null), () => api(`/api/v1/birthdays/${id}`, { method: 'DELETE' }), 'Geburtstag konnte nicht gelöscht werden'),
    [optimistic]
  );

  // ---------------------------------------------------------------- money
  const handleMovePotMoney = useCallback(
    async (potId: string, amount: number, direction: 'deposit' | 'withdraw' = 'deposit') => {
      const sign = direction === 'deposit' ? 1 : -1;
      setData((d) => ({
        ...d,
        savingsPots: d.savingsPots.map((p) => (p.id === potId ? { ...p, currentAmount: Math.max(0, p.currentAmount + sign * amount) } : p)),
        metrics: { ...d.metrics, totalBalance: d.metrics.totalBalance - sign * amount },
      }));
      try {
        const res = await api<{ isGoalReached: boolean; pot: SavingsPot }>(`/api/v1/savings-pots/${potId}/deposit`, { body: { amount, direction } });
        if (res.isGoalReached) {
          fireMilestoneGlow();
          setTimeout(fireMilestoneGlow, 450);
          toast(`🎉 Sparziel „${res.pot.name}“ erreicht!`);
        } else {
          if (direction === 'deposit') fireMilestoneGlow();
          toast(`${formatEuro(amount)} ${direction === 'deposit' ? 'eingezahlt in' : 'entnommen aus'} „${res.pot.name}“`);
        }
        refreshSummary();
      } catch (error) {
        toast(`Buchung fehlgeschlagen: ${errorMessage(error)}`, 'error');
        refreshSummary();
        throw error;
      }
    },
    [toast, refreshSummary]
  );

  const handleUpdatePot = useCallback(
    async (id: string, updates: Partial<SavingsPot>) => {
      try {
        const pot = await api<SavingsPot>(`/api/v1/savings-pots/${id}`, { method: 'PATCH', body: updates });
        setData((d) => ({ ...d, savingsPots: pot.isArchived ? d.savingsPots.filter((p) => p.id !== id) : d.savingsPots.map((p) => (p.id === id ? pot : p)) }));
        toast('Spartopf gespeichert');
        refreshSummary();
      } catch (error) {
        toast(`Spartopf konnte nicht gespeichert werden: ${errorMessage(error)}`, 'error');
        throw error;
      }
    },
    [toast, refreshSummary]
  );

  const handleDeletePot = useCallback(
    async (id: string) => {
      try {
        const { refunded } = await api<{ refunded: number }>(`/api/v1/savings-pots/${id}`, { method: 'DELETE' });
        setDetailsPotId(null);
        setData((d) => ({ ...d, savingsPots: d.savingsPots.filter((p) => p.id !== id) }));
        toast(refunded > 0 ? `Spartopf gelöscht – ${formatEuro(refunded)} zurückgebucht` : 'Spartopf gelöscht');
        refreshSummary();
      } catch (error) {
        toast(`Spartopf konnte nicht gelöscht werden: ${errorMessage(error)}`, 'error');
        throw error;
      }
    },
    [toast, refreshSummary]
  );

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      const ok = await optimistic((d) => updateList(d, 'transactions', id, null), () => api(`/api/v1/transactions/${id}`, { method: 'DELETE' }), 'Buchung konnte nicht gelöscht werden');
      if (ok) {
        toast('Buchung gelöscht');
        refreshSummary();
      }
    },
    [optimistic, toast, refreshSummary]
  );

  // ---------------------------------------------------------------- banking
  const handleBankSync = useCallback(
    async (silent = false) => {
      setBankSyncing(true);
      try {
        const result = await api<{ created: number; errors: { bank: string; message: string }[] }>('/api/v1/banking/sync', { method: 'POST' });
        if (result.errors.length) toast(`${result.errors[0].bank}: ${result.errors[0].message}`, 'error');
        else if (result.created > 0 || !silent) toast(result.created ? `${result.created} neue Umsätze abgerufen` : 'Keine neuen Umsätze');
        await refreshSummary();
      } catch (error) {
        if (!silent) toast(`Abruf fehlgeschlagen: ${errorMessage(error)}`, 'error');
      } finally {
        setBankSyncing(false);
      }
    },
    [toast, refreshSummary]
  );

  // Fetch bookings automatically when the last sync is older than a few hours.
  useEffect(() => {
    const stale = initialData.banking.connections.some(
      (c) => c.status === 'active' && (!c.lastSyncAt || Date.now() - new Date(c.lastSyncAt).getTime() > BANK_SYNC_INTERVAL_MS)
    );
    if (stale) handleBankSync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coming back from the bank's consent page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('bank');
    if (!result) return;
    if (result === 'connected') toast(`Bank verbunden – ${params.get('created') ?? 0} Umsätze übernommen`);
    else toast(`Bankverbindung fehlgeschlagen: ${params.get('message') ?? 'unbekannter Fehler'}`, 'error');
    window.history.replaceState(null, '', window.location.pathname);
    setActiveMode('wealth');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReconnectBank = useCallback(
    async (connection: BankConnectionSummary) => {
      try {
        const { url } = await api<{ url: string }>('/api/v1/banking/connect', { body: { aspspName: connection.aspspName, country: connection.aspspCountry } });
        window.location.href = url;
      } catch (error) {
        toast(errorMessage(error), 'error');
      }
    },
    [toast]
  );

  const handleToggleAccountInclude = useCallback(
    async (account: BankAccountSummary) => {
      try {
        await api(`/api/v1/banking/accounts/${account.id}`, { method: 'PATCH', body: { includeInBalance: !account.includeInBalance } });
        await refreshSummary();
      } catch (error) {
        toast(errorMessage(error), 'error');
      }
    },
    [toast, refreshSummary]
  );

  const handleDeleteAccount = useCallback(
    async (account: BankAccountSummary) => {
      if (!window.confirm(`„${account.name}“ mit allen ${account.transactionCount} Umsätzen entfernen?`)) return;
      try {
        await api(`/api/v1/banking/accounts/${account.id}`, { method: 'DELETE' });
        toast('Konto entfernt');
        await refreshSummary();
      } catch (error) {
        toast(errorMessage(error), 'error');
      }
    },
    [toast, refreshSummary]
  );

  // ---------------------------------------------------------------- widgets
  const timetable = (
    <TimetableSchedule
      schedule={data.schedule}
      untisConfig={data.untisConfig}
      onToggleTaskStatus={handleToggleTaskStatus}
      onOpenUntisModal={() => setIsUntisModalOpen(true)}
      onCreateTask={openNewTask}
      onEditTask={openEditTask}
    />
  );

  const miniCalendar = (
    <MiniCalendar
      subjects={data.subjects}
      selectedSubjectId={selectedSubjectId}
      onSelectSubject={setSelectedSubjectId}
      tasks={data.tasks}
      reminders={data.reminders}
      onEditTask={openEditTask}
    />
  );

  const taskMatrix = (
    <TaskMatrix
      tasks={data.tasks}
      subjects={data.subjects}
      selectedSubjectId={selectedSubjectId}
      onClearSubjectFilter={() => setSelectedSubjectId(null)}
      onToggleStatus={handleToggleTaskStatus}
      onDeleteTask={handleDeleteTask}
      onEditTask={openEditTask}
      onCreateTask={() => openNewTask(selectedSubjectId)}
    />
  );

  const remindersHub = (
    <RemindersHub
      reminders={data.reminders}
      onToggleReminder={handleToggleReminder}
      onDeleteReminder={handleDeleteReminder}
      onSaveReminder={handleSaveReminder}
      createRequest={pending?.kind === 'reminder'}
      onCreateRequestHandled={clearPending}
    />
  );

  const wallet = (
    <WalletCard
      safeToSpendDaily={data.metrics.safeToSpendDaily}
      dailyBudgetBaseline={data.metrics.dailyBudgetBaseline}
      totalBalance={data.metrics.totalBalance}
      freeThisMonth={data.metrics.freeThisMonth}
      pots={data.savingsPots}
      onOpenWealth={() => setActiveMode('wealth')}
      onAddTransaction={() => setIsAddTxOpen(true)}
      onOpenPot={(pot) => setDetailsPotId(pot.id)}
    />
  );

  const totalSaved = data.savingsPots.reduce((sum, p) => sum + p.currentAmount, 0);
  const financeRefreshKey = `${financeVersion}:${data.metrics.totalBalance}:${data.transactions.length}:${data.transactions[0]?.id ?? ''}`;

  return (
    <div className="min-h-screen pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-16">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-sheet"
      >
        Zum Inhalt springen
      </a>

      <TopBar
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenQuickAdd={() => setIsQuickOpen(true)}
        onOpenAppleSyncModal={() => setIsAppleSyncOpen(true)}
        onOpenSettingsModal={() => openSettings()}
        notesCount={data.notes.length}
      />

      <main id="main" className="mx-auto max-w-[1400px] px-3 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        {activeMode === 'all' && (
          <div className="space-y-4 sm:space-y-6">
            <TodayRuler
              schedule={data.schedule}
              tasks={data.tasks}
              reminders={data.reminders}
              exams={data.exams}
              birthdays={data.birthdays}
              displayName={data.user.displayName}
              safeToSpendDaily={data.metrics.safeToSpendDaily}
              onEditTask={openEditTask}
            />
            {/* Phones: to-dos first. Tablets: two columns. Desktop: plan left, to-dos right. */}
            <div className="flex flex-col gap-4 sm:gap-6 md:grid md:grid-cols-2 md:items-start xl:grid-cols-12">
              <div className="contents xl:col-span-7 xl:flex xl:flex-col xl:gap-6">
                <div className="order-4 min-w-0 md:col-span-2">{timetable}</div>
                <div className="order-6 min-w-0">{miniCalendar}</div>
              </div>
              <div className="contents xl:col-span-5 xl:flex xl:flex-col xl:gap-6">
                <div className="order-1 min-w-0">{taskMatrix}</div>
                <div className="order-2 min-w-0">{remindersHub}</div>
                <div className="order-3 min-w-0">
                  <UpcomingCard exams={data.exams} birthdays={data.birthdays} onOpenStudy={() => setActiveMode('study')} onOpenLife={() => setActiveMode('life')} />
                </div>
                <div className="order-5 min-w-0">{wallet}</div>
              </div>
            </div>
          </div>
        )}

        {activeMode === 'study' && (
          <>
            <ModeHeader
              mode="study"
              actions={
                <>
                  <button type="button" onClick={() => quickCreate('exam')} className="btn-secondary">
                    <GraduationCap className="h-4 w-4" /> Prüfung
                  </button>
                  <button type="button" onClick={() => openNewTask(selectedSubjectId)} className="btn-primary">
                    <Plus className="h-4 w-4" /> Hausübung
                  </button>
                </>
              }
            />
            <div className="flex flex-col gap-4 sm:gap-6 xl:grid xl:grid-cols-12 xl:items-start">
              <div className="contents xl:col-span-4 xl:flex xl:flex-col xl:gap-6">
                <div className="order-2 min-w-0">
                  <ExamsCard
                    exams={data.exams}
                    subjects={data.subjects}
                    createRequest={pending?.kind === 'exam'}
                    onCreateRequestHandled={clearPending}
                    onSave={handleSaveExam}
                    onDelete={handleDeleteExam}
                    onToggleDone={handleToggleExamDone}
                    onEnterGrade={handleEnterGradeForExam}
                  />
                </div>
                <div className="order-3 min-w-0">
                  <PomodoroTimer />
                </div>
                <div className="order-6 min-w-0">{miniCalendar}</div>
              </div>
              <div className="contents xl:col-span-8 xl:flex xl:flex-col xl:gap-6">
                <div className="order-1 min-w-0">{taskMatrix}</div>
                <div className="order-4 min-w-0">{timetable}</div>
                <div className="order-5 min-w-0">
                  <GradesCard
                    grades={data.grades}
                    subjects={data.subjects}
                    request={pending?.kind === 'grade' ? pending.prefill ?? {} : null}
                    onRequestHandled={clearPending}
                    onSave={handleSaveGrade}
                    onDelete={handleDeleteGrade}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeMode === 'life' && (
          <>
            <ModeHeader
              mode="life"
              actions={
                <button type="button" onClick={() => quickCreate('reminder')} className="btn-primary">
                  <Bell className="h-4 w-4" /> Erinnerung
                </button>
              }
            />
            <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-12 lg:items-start">
              <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
                <div className="order-1 min-w-0">{remindersHub}</div>
                <div className="order-3 min-w-0">
                  <HabitsCard habits={data.habits} onAdd={handleAddHabit} onToggleDay={handleToggleHabitDay} onDelete={handleDeleteHabit} />
                </div>
              </div>
              <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-6">
                <div className="order-2 min-w-0">
                  <ShoppingList
                    items={data.shopping}
                    focusRequest={pending?.kind === 'shopping'}
                    onFocusHandled={clearPending}
                    onAdd={handleAddShopping}
                    onToggle={handleToggleShopping}
                    onDelete={handleDeleteShopping}
                    onClearDone={handleClearShopping}
                  />
                </div>
                <div className="order-4 min-w-0">
                  <BirthdaysCard
                    birthdays={data.birthdays}
                    createRequest={pending?.kind === 'birthday'}
                    onCreateRequestHandled={clearPending}
                    onAdd={handleAddBirthday}
                    onDelete={handleDeleteBirthday}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeMode === 'wealth' && (
          <>
            <ModeHeader
              mode="wealth"
              actions={
                <>
                  <button type="button" onClick={() => setIsImportOpen(true)} className="btn-secondary">
                    <Upload className="h-4 w-4" /> Import
                  </button>
                  <button type="button" onClick={() => setIsCreatePotOpen(true)} className="btn-secondary hidden sm:inline-flex">
                    <PiggyBank className="h-4 w-4" /> Spartopf
                  </button>
                  <button type="button" onClick={() => setIsAddTxOpen(true)} className="btn-primary">
                    <Plus className="h-4 w-4" /> Buchung
                  </button>
                </>
              }
            />
            <div className="segmented mb-4 grid-cols-3 sm:mb-6 sm:inline-grid" role="tablist" aria-label="Geld-Bereiche">
              {WEALTH_VIEWS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={wealthView === id}
                  aria-pressed={wealthView === id}
                  onClick={() => {
                    if (id === 'transactions' && wealthView !== 'transactions') setTxFilter({});
                    setWealthView(id);
                  }}
                  className="segmented-item sm:px-5"
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            {wealthView === 'analysis' && (
              <FinanceAnalysis
                refreshKey={financeRefreshKey}
                onChanged={refreshSummary}
                onShowTransactions={openTransactions}
                onImport={() => setIsImportOpen(true)}
                onAddTransaction={() => setIsAddTxOpen(true)}
              />
            )}

            {wealthView === 'transactions' && (
              <div className="mx-auto max-w-3xl">
                <TransactionsBrowser filter={txFilter} refreshKey={financeRefreshKey} onChanged={refreshSummary} onDelete={handleDeleteTransaction} />
              </div>
            )}

            {wealthView === 'overview' && (
            <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-12 lg:items-start">
              <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-6">
                <div className="order-1 min-w-0">
                  <SafeToSpendDial
                    safeToSpendDaily={data.metrics.safeToSpendDaily}
                    dailyBudgetBaseline={data.metrics.dailyBudgetBaseline}
                    totalBalance={data.metrics.totalBalance}
                    freeThisMonth={data.metrics.freeThisMonth}
                    monthlyBudget={data.user.monthlyBudget}
                    onOpenSettings={() => openSettings('profile')}
                  />
                </div>
                <div className="order-4 min-w-0">
                  <CashflowRadar
                    transactions={data.transactions}
                    monthlySavingsRate={data.metrics.monthlySavingsRate}
                    fixedCostsMonthly={data.metrics.fixedCostsMonthly}
                    fixedCostsCovered={data.metrics.fixedCostsCovered}
                    onAddTransaction={() => setIsAddTxOpen(true)}
                    onDeleteTransaction={handleDeleteTransaction}
                    onEditTransaction={(tx) =>
                      setEditingTx({
                        id: tx.id,
                        title: tx.title,
                        amount: tx.amount,
                        category: tx.category,
                        type: tx.type,
                        isRecurring: tx.isRecurring,
                        date: tx.transactionDate,
                        counterparty: tx.counterparty,
                        description: tx.description,
                        account: tx.bankAccount?.name,
                      })
                    }
                    onShowAll={() => openTransactions({})}
                  />
                </div>
              </div>
              <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
                <div className="order-2 min-w-0">
                  <BankAccountsCard
                    banking={data.banking}
                    syncing={bankSyncing}
                    onSync={() => handleBankSync()}
                    onImport={() => setIsImportOpen(true)}
                    onOpenBankSettings={() => openSettings('banks')}
                    onReconnect={handleReconnectBank}
                    onToggleInclude={handleToggleAccountInclude}
                    onDeleteAccount={handleDeleteAccount}
                  />
                </div>
                <section className="order-3 min-w-0">
                  <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                    <h2 className="card-title">Spartöpfe</h2>
                    <span className="font-mono text-[13px] text-ink-3 tabular">{formatEuro(totalSaved, 0)} gespart</span>
                  </div>
                  {data.savingsPots.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsCreatePotOpen(true)}
                      className="card flex w-full flex-col items-center gap-2 border-dashed p-8 text-center text-ink-2 hover:text-ink"
                    >
                      <PiggyBank className="h-6 w-6" />
                      <span className="font-bold">Erstes Sparziel anlegen</span>
                      <span className="text-[13px] text-ink-3">z. B. Führerschein, neues Handy, Urlaub</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {data.savingsPots.map((pot) => (
                        <SavingsPotCard
                          key={pot.id}
                          pot={pot}
                          onQuickDeposit={(potId, amount) => handleMovePotMoney(potId, amount, 'deposit')}
                          onOpenDetails={(p) => setDetailsPotId(p.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
            )}
          </>
        )}

        {activeMode === 'skills' && (
          <>
            <ModeHeader mode="skills" />
            <SkillsHub
              skills={data.skills}
              onSkillsChange={(update) => setData((d) => ({ ...d, skills: update(d.skills) }))}
              createRequest={pending?.kind === 'skill'}
              onCreateRequestHandled={clearPending}
            />
          </>
        )}

        {activeMode === 'notes' && (
          <>
            <ModeHeader mode="notes" />
            <NotesHub
              notes={data.notes}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              createRequest={pending?.kind === 'note'}
              onCreateRequestHandled={clearPending}
            />
          </>
        )}
      </main>

      <MobileDock activeMode={activeMode} setActiveMode={setActiveMode} onOpenQuickAdd={() => setIsQuickOpen(true)} />

      {/* Global modals */}
      <QuickCreateSheet isOpen={isQuickOpen} onClose={() => setIsQuickOpen(false)} onSelect={quickCreate} />

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        tasks={data.tasks}
        notes={data.notes}
        reminders={data.reminders}
        setActiveMode={setActiveMode}
        onQuickAddSuccess={(message) => {
          toast(message);
          refreshSummary();
        }}
        onOpenTask={(task) => (task ? openEditTask(task) : openNewTask(selectedSubjectId))}
        onOpenNote={openNote}
        onOpenCreatePot={() => setIsCreatePotOpen(true)}
        onOpenTransaction={() => setIsAddTxOpen(true)}
        onOpenSettings={() => openSettings()}
        onOpenUntis={() => setIsUntisModalOpen(true)}
        onOpenAppleSync={() => setIsAppleSyncOpen(true)}
        onQuickCreate={quickCreate}
      />

      <TaskModal
        isOpen={!!taskModal}
        onClose={() => setTaskModal(null)}
        subjects={data.subjects}
        task={taskModal?.task ?? null}
        initialSubjectId={taskModal?.subjectId ?? null}
        onSaved={handleTaskSaved}
        onDelete={handleDeleteTask}
      />

      <WebUntisModal
        isOpen={isUntisModalOpen}
        onClose={() => setIsUntisModalOpen(false)}
        config={data.untisConfig}
        onSyncCompleted={(message) => {
          toast(message);
          refreshSummary();
        }}
      />

      <AppleSyncModal isOpen={isAppleSyncOpen} onClose={() => setIsAppleSyncOpen(false)} icalToken={data.icalToken} />

      <CreatePotModal
        isOpen={isCreatePotOpen}
        onClose={() => setIsCreatePotOpen(false)}
        onPotCreated={(pot) => {
          setData((d) => ({ ...d, savingsPots: [pot, ...d.savingsPots] }));
          toast(`Spartopf „${pot.name}“ angelegt`);
          refreshSummary();
        }}
      />

      <PotDetailsModal pot={detailsPot} onClose={() => setDetailsPotId(null)} onMoveMoney={handleMovePotMoney} onUpdatePot={handleUpdatePot} onDeletePot={handleDeletePot} />

      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onTransactionCreated={(tx) => {
          toast(`${tx.type === 'income' ? 'Einnahme' : 'Ausgabe'} „${tx.title}“ gespeichert`);
          refreshSummary();
        }}
      />

      <TransactionEditModal transaction={editingTx} onClose={() => setEditingTx(null)} onSaved={refreshSummary} onDelete={handleDeleteTransaction} />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={(message) => {
          toast(message);
          refreshSummary();
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        user={data.user}
        subjects={data.subjects}
        untisConfig={data.untisConfig}
        banking={data.banking}
        onBankingChanged={refreshSummary}
        onSettingsSaved={refreshSummary}
        onUntisSynced={(message) => {
          toast(message);
          refreshSummary();
        }}
        onOpenAppleSyncModal={() => {
          setIsSettingsOpen(false);
          setIsAppleSyncOpen(true);
        }}
      />
    </div>
  );
}
