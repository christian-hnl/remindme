export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'archived';
export type TransactionType = 'income' | 'expense' | 'transfer_to_pot';
export type WorkspaceMode = 'all' | 'study' | 'wealth' | 'weekend' | 'notes';

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
  category: string; // "Haushalt", "Erledigung", "Gesundheit", "Person", "Sonstiges"
  hasDueDate: boolean;
  dueTime?: string | null; // e.g. "18:30"
  dueDate?: string | null; // ISO string or null
  personName?: string | null; // e.g. "Mama", "Herr Weber", "Lukas"
  reminderType?: 'say_to_person' | 'action' | 'errand' | 'todo';
  isDone: boolean;
  icon: string;
  priority: 'low' | 'medium' | 'high';
  repeatPattern: 'none' | 'daily' | 'weekly';
  createdAt?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string; // "Gedanken", "Uni", "Ideen", "Wichtig"
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
  isConnected: boolean;
  lastSyncAt?: string | null;
  autoSync: boolean;
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
}

export interface DashboardSummary {
  user: {
    displayName: string;
    email: string;
  };
  metrics: {
    totalBalance: number;
    safeToSpendDaily: number;
    monthlySavingsRate: number;
    urgentTasksCount: number;
    todaysStudyMinutes: number;
    fixedCostsCovered: boolean;
    pendingRemindersCount?: number;
    notesCount?: number;
  };
  tasks: Task[];
  savingsPots: SavingsPot[];
  transactions: Transaction[];
  schedule: ScheduleBlock[];
  subjects: Subject[];
  reminders: Reminder[];
  notes: Note[];
  untisConfig: WebUntisConfig | null;
}
