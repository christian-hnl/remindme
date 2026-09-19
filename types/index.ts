export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'archived';
export type TransactionType = 'income' | 'expense' | 'transfer_to_pot' | 'transfer_from_pot' | 'transfer' | 'investment';
export type WorkspaceMode = 'all' | 'study' | 'life' | 'wealth' | 'skills' | 'bible' | 'notes';
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
  /** Untis student-group tag (Gruppe 1/2, Schwerpunkte); null = everyone attends. */
  studentGroup?: string | null;
  /** Untis exam period – mirrored into an Exam automatically. */
  isExam?: boolean;
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
  /** Student-group tags (see ScheduleBlock.studentGroup) the user identifies with. */
  selectedGroups: string[];
  /** Lesson keys (see lessonKey) the user marked as "not mine". */
  hiddenLessons: string[];
  /** Slots that alternate week by week (one week teacher A, the next teacher B). */
  rotatingLessons: { keys: string[]; anchorMonday: string; anchorKey: string }[];
  /** Every group tag found in the synced timetable, before filtering. */
  availableGroups?: { tag: string; count: number; subjects: string[] }[];
  /** Slots with parallel lessons, so the user can pick which half of the class they're in. */
  parallelSlots?: {
    day: number;
    startTime: string;
    endTime: string;
    lessons: {
      key: string;
      subjectCode: string;
      subjectName: string;
      teacher?: string | null;
      room?: string | null;
      studentGroup?: string | null;
      colorHex: string;
      hidden: boolean;
      rotatedAway: boolean;
    }[];
  }[];
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

export interface ExamTopic {
  id: string;
  title: string;
  isDone: boolean;
  position: number;
}

export interface Exam {
  id: string;
  title: string;
  kind: ExamKind;
  date: string;
  topics?: string | null;
  topicItems: ExamTopic[];
  isDone: boolean;
  subjectId?: string | null;
  subject?: Subject | null;
  /** Auto-detected from WebUntis (lesson type "ex"). */
  isUntisSync?: boolean;
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

// ---------------------------------------------------------------- bible

export interface BibleBookmark {
  id: string;
  translation: string;
  bookNr: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  note?: string | null;
  createdAt: string;
}

export interface DailyVerse {
  reference: string;
  bookNr: number;
  bookName: string;
  chapter: number;
  verse: number;
  endVerse: number | null;
  text: string;
  translation: string;
}

export interface BibleChapterData {
  translation: string;
  bookNr: number;
  bookName: string;
  chapter: number;
  chapterCount: number;
  verses: { verse: number; text: string }[];
}

// ---------------------------------------------------------------- finance analysis

export type AnalyticsRange = 'month' | 'last-month' | '3m' | '6m' | '12m';

export interface AnalyticsTransaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  account?: string | null;
  type: TransactionType;
  isRecurring: boolean;
  counterparty?: string | null;
}

export interface CategoryAnalysis {
  category: string;
  amount: number;
  share: number;
  count: number;
  previous: number;
  /** Relative change to the previous period, null without comparison data. */
  change: number | null;
  /** Average per month over the last 6 complete months. */
  avgMonthly: number;
  /** Amount per month in the selected period. */
  perMonth: number;
  /** Last 6 complete months + current month. */
  trend: number[];
  budget: number | null;
  merchants: { name: string; amount: number; count: number }[];
}

export interface RecurringPayment {
  key: string;
  name: string;
  category: string;
  type: 'expense' | 'income';
  amount: number;
  interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  monthlyAmount: number;
  yearlyAmount: number;
  lastDate: string;
  nextDate: string;
  count: number;
  priceChange: { from: number; to: number } | null;
}

export interface FinanceInsight {
  tone: 'good' | 'warn' | 'info';
  title: string;
  text: string;
}

export interface FinanceAnalytics {
  range: AnalyticsRange;
  label: string;
  from: string;
  to: string;
  days: number;
  hasData: boolean;
  totals: {
    income: number;
    expenses: number;
    invested: number;
    net: number;
    savingsRate: number | null;
    avgPerDay: number;
    avgPerMonth: number;
    count: number;
  };
  previous: { income: number; expenses: number; net: number };
  categories: CategoryAnalysis[];
  incomeCategories: { category: string; amount: number; share: number }[];
  topExpenses: AnalyticsTransaction[];
  merchants: { name: string; amount: number; count: number; category: string }[];
  /** Monday first. */
  weekdays: { label: string; amount: number; avgPerDay: number }[];
  monthly: { key: string; label: string; income: number; expenses: number; net: number; isCurrent: boolean }[];
  food: { total: number; groceries: number; eatingOut: number; perDay: number; share: number; previous: number; topPlaces: { name: string; amount: number; count: number }[] };
  recurring: RecurringPayment[];
  recurringMonthly: number;
  forecast: {
    balance: number;
    spentSoFar: number;
    incomeSoFar: number;
    projectedExpenses: number;
    projectedIncome: number;
    projectedNet: number;
    endOfMonthBalance: number;
    dailyPace: number;
    budget: number;
    projectedDiscretionary: number;
    pending: { name: string; amount: number; date: string; type: 'expense' | 'income' }[];
    avgMonthlyNet: number;
    points: { label: string; balance: number }[];
    daysLeft: number;
  };
  budgets: { category: string; limit: number }[];
  insights: FinanceInsight[];
}

// ---------------------------------------------------------------- skills

export type SkillStatus = 'idea' | 'active' | 'paused' | 'done';
export type SkillResourceKind = 'video' | 'course' | 'book' | 'app' | 'article' | 'other';

export interface SkillStep {
  id: string;
  title: string;
  isDone: boolean;
  position: number;
}

export interface SkillResource {
  id: string;
  title: string;
  url?: string | null;
  kind: SkillResourceKind;
  isDone: boolean;
}

export interface SkillSession {
  id: string;
  minutes: number;
  date: string;
  note?: string | null;
}

export interface Skill {
  id: string;
  title: string;
  emoji: string;
  category: string;
  status: SkillStatus;
  why?: string | null;
  weeklyMinutes: number;
  targetDate?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  steps: SkillStep[];
  resources: SkillResource[];
  /** Sessions of the last ~12 weeks. */
  sessions: SkillSession[];
  totalMinutes: number;
}

export interface DashboardSummary {
  user: {
    id: string;
    displayName: string;
    email: string;
    monthlyBudget: number;
    startingBalance: number;
    /** Name entered or welcome skipped. */
    onboarded: boolean;
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
  skills: Skill[];
  bibleBookmarks: BibleBookmark[];
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
