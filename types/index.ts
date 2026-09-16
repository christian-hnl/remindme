export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'archived';
export type TransactionType = 'income' | 'expense' | 'transfer_to_pot' | 'transfer_from_pot' | 'transfer' | 'investment';
export type WorkspaceMode = 'all' | 'study' | 'life' | 'wealth' | 'notes';
export type RepeatPattern = 'none' | 'daily' | 'weekly';
export type BankSource = 'enablebanking' | 'george' | 'traderepublic' | 'finanzguru' | 'file';
export type ExamKind = 'schularbeit' | 'test' | 'pruefung' | 'referat' | 'sonstiges';
export type GradeKind = 'schularbeit' | 'test' | 'mitarbeit' | 'sonstiges';

export interface Subject {
  id: string;
  name: string;
  untisCode?: string | null;
  colorHex: string;
  icon: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string; // ISO string
  estimatedMinutes: number;
  priority: Priority;
  status: TaskStatus;
  subjectId?: string | null;
  subject?: Subject | null;
  scheduleBlockId?: string | null;
  isUntisSync?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  subjectId?: string | null;
  subject?: Subject | null;
  subjectCode?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacher?: string | null;
  colorHex: string;
  isCancelled?: boolean;
  substitutionNote?: string | null;
  externalUntisId?: string | null;
  tasks?: Task[];
}

export interface Reminder {
  id: string;
  title: string;
  category: string;
  hasDueDate: boolean;
  dueTime?: string | null; // e.g. "18:30"
  dueDate?: string | null; // ISO string or null
  personName?: string | null;
  reminderType?: 'say_to_person' | 'action' | 'errand' | 'todo';
  isDone: boolean;
  icon: string;
  priority: 'low' | 'medium' | 'high';
  repeatPattern: RepeatPattern;
  createdAt?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebUntisConfig {
  id: string;
  school: string;
  schoolName: string;
  server: string;
  username: string;
  icalUrl?: string | null;
  hasPassword: boolean;
  isConnected: boolean;
  lastSyncAt?: string | null;
  autoSync: boolean;
  timetableScope: 'personal' | 'class';
}

export interface SavingsPot {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate?: string | null;
  icon: string;
  colorHex: string;
  isArchived: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: TransactionType;
  isRecurring: boolean;
  transactionDate: string;
  savingsPotId?: string | null;
  source?: string;
  counterparty?: string | null;
  description?: string | null;
  bankAccountId?: string | null;
  bankAccount?: { name: string; source: string } | null;
}

export interface BankAccountSummary {
  id: string;
  name: string;
  source: BankSource;
  iban?: string | null;
  currency: string;
  /** Reported by the bank when available, otherwise the sum of imported bookings. */
  balance: number;
  balanceIsReported: boolean;
  balanceUpdatedAt?: string | null;
  includeInBalance: boolean;
  lastImportAt?: string | null;
  connectionId?: string | null;
  transactionCount: number;
}

export interface BankConnectionSummary {
  id: string;
  aspspName: string;
  aspspCountry: string;
  status: 'pending' | 'active' | 'expired' | 'error';
  validUntil?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
}

export interface Exam {
  id: string;
  title: string;
  kind: ExamKind;
  date: string;
  topics?: string | null;
  isDone: boolean;
  subjectId?: string | null;
  subject?: Subject | null;
}

export interface Grade {
  id: string;
  value: number;
  kind: GradeKind;
  weight: number;
  title?: string | null;
  date: string;
  subjectId?: string | null;
  subject?: Subject | null;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string | null;
  isDone: boolean;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  /** Days (yyyy-MM-dd) of the last ~60 days on which the habit was done. */
  days: string[];
  createdAt: string;
}

export interface Birthday {
  id: string;
  name: string;
  month: number;
  day: number;
  year?: number | null;
  note?: string | null;
}

export interface DashboardSummary {
  user: {
    id: string;
    displayName: string;
    email: string;
    monthlyBudget: number;
    startingBalance: number;
  };
  metrics: {
    totalBalance: number;
    /** What can still be spent today without breaking the monthly budget. */
    safeToSpendDaily: number;
    /** Even daily share of the monthly budget, used as 100 % reference. */
    dailyBudgetBaseline: number;
    /** Discretionary budget left for the rest of the month. */
    freeThisMonth: number;
    monthlySavingsRate: number;
    fixedCostsMonthly: number;
    fixedCostsCovered: boolean;
    urgentTasksCount: number;
    overdueTasksCount: number;
    todaysStudyMinutes: number;
    pendingRemindersCount: number;
    notesCount: number;
  };
  tasks: Task[];
  savingsPots: SavingsPot[];
  transactions: Transaction[];
  schedule: ScheduleBlock[];
  subjects: Subject[];
  reminders: Reminder[];
  notes: Note[];
  exams: Exam[];
  grades: Grade[];
  shopping: ShoppingItem[];
  habits: Habit[];
  birthdays: Birthday[];
  untisConfig: WebUntisConfig | null;
  banking: {
    /** Enable Banking credentials are stored (or provided via environment). */
    configured: boolean;
    accounts: BankAccountSummary[];
    connections: BankConnectionSummary[];
  };
  /** Token for the protected iCal feed, null when the app runs without APP_PASSWORD. */
  icalToken: string | null;
}
