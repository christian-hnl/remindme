import { db } from '@/lib/db';
import { DashboardContainer } from '@/components/DashboardContainer';
import { DashboardSummary } from '@/types';

export const dynamic = 'force-dynamic';

async function getDashboardData(): Promise<DashboardSummary> {
  const user = await db.user.findFirst({
    where: { email: 'alexander@example.com' },
  });

  if (!user) {
    // Fallback data if DB was not seeded yet
    return {
      user: { displayName: 'Alexander', email: 'alexander@example.com' },
      metrics: {
        totalBalance: 2840.5,
        safeToSpendDaily: 24.5,
        monthlySavingsRate: 250.0,
        urgentTasksCount: 2,
        todaysStudyMinutes: 75,
        fixedCostsCovered: true,
      },
      tasks: [],
      savingsPots: [],
      transactions: [],
      schedule: [],
      subjects: [],
    };
  }

  const [tasks, savingsPots, transactions, schedule, subjects] = await Promise.all([
    db.task.findMany({
      where: { userId: user.id },
      include: { subject: true },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    }),
    db.savingsPot.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: 'desc' },
    }),
    db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { transactionDate: 'desc' },
      take: 15,
    }),
    db.scheduleBlock.findMany({
      where: { userId: user.id },
      orderBy: { startTime: 'asc' },
    }),
    db.subject.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    }),
  ]);

  const incomeTotal = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseTotal = transactions
    .filter((t) => t.type === 'expense' || t.type === 'transfer_to_pot')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalBalance = 2840.5 + (incomeTotal - expenseTotal);
  const monthlySavingsRate = savingsPots.reduce((acc, p) => acc + p.monthlyContribution, 0);

  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, lastDayOfMonth - now.getDate() + 1);
  const discretionaryBudget = 580.0;
  const todaysSpent = transactions
    .filter((t) => {
      const d = new Date(t.transactionDate);
      return d.toDateString() === now.toDateString() && t.type === 'expense' && t.category !== 'Fixkosten';
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const safeToSpendDaily = Math.max(0, +(discretionaryBudget / remainingDays - todaysSpent).toFixed(2));
  const urgentTasksCount = tasks.filter((t) => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high')).length;
  const todaysStudyMinutes = tasks
    .filter((t) => t.status !== 'done')
    .reduce((acc, t) => acc + t.estimatedMinutes, 0);

  return {
    user: {
      displayName: user.displayName,
      email: user.email,
    },
    metrics: {
      totalBalance,
      safeToSpendDaily: safeToSpendDaily || 24.5,
      monthlySavingsRate: monthlySavingsRate || 250.0,
      urgentTasksCount,
      todaysStudyMinutes,
      fixedCostsCovered: true,
    },
    tasks: JSON.parse(JSON.stringify(tasks)),
    savingsPots: JSON.parse(JSON.stringify(savingsPots)),
    transactions: JSON.parse(JSON.stringify(transactions)),
    schedule: JSON.parse(JSON.stringify(schedule)),
    subjects: JSON.parse(JSON.stringify(subjects)),
  };
}

export default async function HomePage() {
  const data = await getDashboardData();

  return <DashboardContainer initialData={data} />;
}
