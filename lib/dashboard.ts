import { format } from 'date-fns';
import { db } from '@/lib/db';
import { getCurrentUser, readPreferences } from '@/lib/user';
import { filterByGroups, findParallelSlots, lessonKey, parseRotations, parseStringList, rotationHiddenKeys, toSafeUntisConfig } from '@/lib/webuntis';
import { getIcalToken } from '@/lib/auth';
import type { DashboardSummary } from '@/types';
import { loadSkills } from '@/lib/skills-db';
import { toSafeVmmConfigWithGroups } from '@/lib/vmm';

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const user = await getCurrentUser();
  const prefs = readPreferences(user);
  const userId = user.id;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - now.getDate() + 1;

  const [
    tasks,
    savingsPots,
    transactions,
    rawSchedule,
    subjects,
    reminders,
    notes,
    untisConfig,
    manualBalance,
    discretionarySpending,
    recurringExpenses,
    bankAccounts,
    accountSums,
    bankConnections,
    bankingConfig,
    exams,
    grades,
    shoppingItems,
    habits,
    birthdays,
    skills,
    bibleBookmarks,
    vmmConfig,
  ] = await Promise.all([
    db.task.findMany({
      where: { userId, status: { not: 'archived' } },
      include: { subject: true },
      orderBy: { dueDate: 'asc' },
    }),
    db.savingsPot.findMany({ where: { userId, isArchived: false }, orderBy: { createdAt: 'desc' } }),
    db.transaction.findMany({
      where: { userId },
      include: { bankAccount: { select: { name: true, source: true } } },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      take: 40,
    }),
    db.scheduleBlock.findMany({
      where: { userId },
      include: {
        subject: true,
        tasks: { where: { status: { not: 'archived' } }, include: { subject: true }, orderBy: { dueDate: 'asc' } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    }),
    db.subject.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    db.reminder.findMany({ where: { userId }, orderBy: [{ isDone: 'asc' }, { createdAt: 'desc' }] }),
    db.note.findMany({ where: { userId }, orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }] }),
    db.webUntisConfig.findUnique({ where: { userId } }),
    // Bookings without a bank account: manual entries and savings-pot transfers.
    db.transaction.aggregate({ where: { userId, bankAccountId: null }, _sum: { amount: true } }),
    db.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        category: { not: 'Fixkosten' },
        transactionDate: { gte: monthStart, lt: todayEnd },
      },
      select: { amount: true, transactionDate: true },
    }),
    db.transaction.findMany({
      where: { userId, type: 'expense', isRecurring: true },
      orderBy: { transactionDate: 'desc' },
      select: { title: true, amount: true },
    }),
    db.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { transactions: true } } },
    }),
    db.transaction.groupBy({ by: ['bankAccountId'], where: { userId, bankAccountId: { not: null } }, _sum: { amount: true } }),
    db.bankConnection.findMany({ where: { userId, status: { not: 'pending' } }, orderBy: { createdAt: 'desc' } }),
    db.bankingConfig.findUnique({ where: { userId }, select: { appId: true, privateKey: true } }),
    db.exam.findMany({
      where: { userId, OR: [{ isDone: false }, { date: { gte: new Date(now.getTime() - 60 * 86_400_000) } }] },
      include: { subject: true, topicItems: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: { date: 'asc' },
    }),
    db.grade.findMany({ where: { userId }, include: { subject: true }, orderBy: { date: 'desc' } }),
    db.shoppingItem.findMany({
      where: { userId, OR: [{ isDone: false }, { doneAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } }] },
      orderBy: [{ isDone: 'asc' }, { createdAt: 'desc' }],
    }),
    db.habit.findMany({
      where: { userId, archived: false },
      include: { logs: { where: { day: { gte: format(new Date(now.getTime() - 62 * 86_400_000), 'yyyy-MM-dd') } }, select: { day: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.birthday.findMany({ where: { userId }, orderBy: [{ month: 'asc' }, { day: 'asc' }] }),
    loadSkills(userId),
    db.bibleBookmark.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    db.vmmConfig.findUnique({ where: { userId }, include: { groups: { orderBy: { name: 'asc' } } } }),
  ]);

  // Accounts with a bank-reported balance use it; imported accounts sum their bookings.
  const sums = new Map(accountSums.map((s) => [s.bankAccountId, s._sum.amount ?? 0]));
  const accounts = bankAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    source: a.source,
    iban: a.iban,
    currency: a.currency,
    balance: round2(a.balance ?? sums.get(a.id) ?? 0),
    balanceIsReported: a.balance !== null,
    balanceUpdatedAt: a.balanceUpdatedAt,
    includeInBalance: a.includeInBalance,
    lastImportAt: a.lastImportAt,
    connectionId: a.connectionId,
    transactionCount: a._count.transactions,
  }));
  const bankTotal = accounts.filter((a) => a.includeInBalance).reduce((sum, a) => sum + a.balance, 0);

  // Starting balance covers cash and accounts without a connection.
  const totalBalance = round2(user.startingBalance + (manualBalance._sum.amount ?? 0) + bankTotal);

  // Safe-to-spend: split what's left of this month's discretionary budget (as of this
  // morning) evenly across the remaining days, then subtract what was spent today.
  const monthlyBudget = user.monthlyBudget;
  let spentBeforeToday = 0;
  let spentToday = 0;
  for (const t of discretionarySpending) {
    if (t.transactionDate >= todayStart) spentToday += Math.abs(t.amount);
    else spentBeforeToday += Math.abs(t.amount);
  }
  const dailyAllowance = Math.max(0, monthlyBudget - spentBeforeToday) / remainingDays;
  const safeToSpendDaily = round2(Math.max(0, dailyAllowance - spentToday));
  const freeThisMonth = round2(Math.max(0, monthlyBudget - spentBeforeToday - spentToday));

  // Recurring costs: the most recent booking per title represents one month.
  const seenRecurring = new Set<string>();
  let fixedCostsMonthly = 0;
  for (const t of recurringExpenses) {
    const key = t.title.trim().toLowerCase();
    if (seenRecurring.has(key)) continue;
    seenRecurring.add(key);
    fixedCostsMonthly += Math.abs(t.amount);
  }

  // Hide the parallel groups/Schwerpunkte the user isn't in (see WebUntisConfig.selectedGroups)
  // and the parallel lessons they marked as "not mine".
  const selectedGroups = parseStringList(untisConfig?.selectedGroups);
  const hiddenLessons = parseStringList(untisConfig?.hiddenLessons);
  const rotations = parseRotations(untisConfig?.rotatingLessons);
  const schedule = filterByGroups(rawSchedule, selectedGroups, hiddenLessons, rotations, now);
  // Keys hidden this week only because of a weekly rotation – shown differently in the settings.
  const rotatedAway = new Set(rotationHiddenKeys(rotations, now));
  const visibleKeys = new Set(schedule.map(lessonKey));

  // Every group tag in the timetable (before filtering), so the settings can offer all of them.
  // Tags like "RE_ClusterA1" only make sense next to their subject, so collect those too.
  const groupInfo = new Map<string, { count: number; subjects: Set<string> }>();
  for (const block of rawSchedule) {
    if (!block.studentGroup) continue;
    const entry = groupInfo.get(block.studentGroup) ?? { count: 0, subjects: new Set<string>() };
    entry.count += 1;
    entry.subjects.add(block.subject?.name ?? block.subjectCode ?? block.title);
    groupInfo.set(block.studentGroup, entry);
  }
  const availableGroups = [...groupInfo.entries()]
    .map(([tag, { count, subjects }]) => ({ tag, count, subjects: [...subjects] }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'de'));

  // Slots with parallel lessons, so the settings can ask which half of the class the user is in.
  const parallelSlots = findParallelSlots(rawSchedule).map((slot) => ({
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    lessons: slot.lessons.map((lesson) => ({
      key: lessonKey(lesson),
      subjectCode: lesson.subjectCode ?? '',
      subjectName: lesson.subject?.name ?? lesson.title,
      teacher: lesson.teacher,
      room: lesson.room,
      studentGroup: lesson.studentGroup,
      colorHex: lesson.colorHex,
      // Whatever rule removed it – if it isn't in the filtered plan, it isn't shown.
      hidden: !visibleKeys.has(lessonKey(lesson)),
      /** Hidden only because another lesson has this week's turn. */
      rotatedAway: rotatedAway.has(lessonKey(lesson)),
    })),
  }));

  const openTasks = tasks.filter((t) => t.status !== 'done');
  const overdueTasksCount = openTasks.filter((t) => t.dueDate < now).length;
  const urgentTasksCount = openTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high' || t.dueDate < now).length;
  const todaysStudyMinutes = openTasks
    .filter((t) => t.dueDate >= todayStart && t.dueDate < todayEnd)
    .reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const summary = {
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      monthlyBudget,
      startingBalance: user.startingBalance,
      onboarded: !!user.displayName || prefs.onboardingDone === true,
    },
    metrics: {
      totalBalance,
      safeToSpendDaily,
      dailyBudgetBaseline: round2(monthlyBudget / daysInMonth),
      freeThisMonth,
      monthlySavingsRate: round2(savingsPots.reduce((sum, p) => sum + p.monthlyContribution, 0)),
      fixedCostsMonthly: round2(fixedCostsMonthly),
      fixedCostsCovered: totalBalance >= fixedCostsMonthly,
      urgentTasksCount,
      overdueTasksCount,
      todaysStudyMinutes,
      pendingRemindersCount: reminders.filter((r) => !r.isDone).length,
      notesCount: notes.length,
    },
    tasks,
    savingsPots,
    transactions,
    schedule,
    subjects,
    reminders,
    notes,
    exams,
    grades,
    shopping: shoppingItems,
    habits: habits.map(({ logs, ...habit }) => ({ ...habit, days: logs.map((l) => l.day) })),
    birthdays,
    skills,
    bibleBookmarks,
    untisConfig: untisConfig ? { ...toSafeUntisConfig(untisConfig)!, availableGroups, parallelSlots } : null,
    vmm: toSafeVmmConfigWithGroups(vmmConfig),
    banking: {
      configured:
        !!(process.env['ENABLE_BANKING_APP_ID'] && process.env['ENABLE_BANKING_PRIVATE_KEY']) ||
        !!(bankingConfig?.appId && bankingConfig.privateKey),
      accounts,
      connections: bankConnections.map((c) => ({
        id: c.id,
        aspspName: c.aspspName,
        aspspCountry: c.aspspCountry,
        status: c.status === 'active' && c.validUntil && c.validUntil < now ? 'expired' : c.status,
        validUntil: c.validUntil,
        lastSyncAt: c.lastSyncAt,
        lastError: c.lastError,
      })),
    },
    icalToken: getIcalToken(),
  };

  // Dates → ISO strings, so server component props and API responses share one shape.
  return JSON.parse(JSON.stringify(summary));
}
