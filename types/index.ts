export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'archived';
export type TransactionType = 'income' | 'expense' | 'transfer_to_pot';
export type WorkspaceMode = 'all' | 'study' | 'wealth' | 'weekend';

export interface Subject {
  id: string;
  name: string;
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
  createdAt: string;
  updatedAt: string;
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

export interface ScheduleBlock {
  id: string;
  title: string;
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  startTime: string; // "09:00"
  endTime: string;   // "11:30"
  room?: string | null;
  colorHex: string;
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
  };
  tasks: Task[];
  savingsPots: SavingsPot[];
  transactions: Transaction[];
  schedule: ScheduleBlock[];
  subjects: Subject[];
}
