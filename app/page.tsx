import { db } from '@/lib/db';
import { DashboardContainer } from '@/components/DashboardContainer';
import { DashboardSummary } from '@/types';
import { syncWebUntisData } from '@/lib/webuntis';

export const dynamic = 'force-dynamic';

async function getDashboardData(): Promise<DashboardSummary> {
  let user = await db.user.findFirst({
    where: { email: 'alexander@example.com' },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        email: 'alexander@example.com',
        displayName: 'Alexander',
      },
    });
  }

  // Check if WebUntis is synced, if not sync initial schedule
  const untisConfig = await db.webUntisConfig.findUnique({
    where: { userId: user.id },
  });
  if (!untisConfig) {
    await syncWebUntisData(user.id);
  }

  // Ensure default reminders exist if empty
  const reminderCount = await db.reminder.count({ where: { userId: user.id } });
  if (reminderCount === 0) {
    await db.reminder.createMany({
      data: [
        {
          userId: user.id,
          title: 'Wäsche rausbringen / aufhängen',
          category: 'Haushalt',
          dueTime: '18:30',
          dueDate: new Date(),
          icon: 'shirt',
          priority: 'medium',
        },
        {
          userId: user.id,
          title: 'Paket aus Packstation abholen (DHL Code 842)',
          category: 'Erledigung',
          dueTime: '17:00',
          dueDate: new Date(),
          icon: 'package',
          priority: 'high',
        },
        {
          userId: user.id,
          title: 'Vitamine & Omega-3 nehmen',
          category: 'Gesundheit',
          dueTime: '08:30',
          dueDate: new Date(),
          icon: 'pill',
          priority: 'low',
          repeatPattern: 'daily',
        },
      ],
    });
  }

  const [tasks, savingsPots, transactions, schedule, subjects, reminders, freshUntisConfig] = await Promise.all([
    db.task.findMany({
      where: { userId: user.id },
      include: { subject: true, scheduleBlock: true },
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
      include: {
        subject: true,
        tasks: {
          where: { status: { not: 'archived' } },
          include: { subject: true },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    }),
    db.subject.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    }),
    db.reminder.findMany({
      where: { userId: user.id },
      orderBy: [
        { isDone: 'asc' },
        { dueDate: 'asc' },
      ],
    }),
    db.webUntisConfig.findUnique({
      where: { userId: user.id },
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

  const pendingRemindersCount = reminders.filter((r) => !r.isDone).length;

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
      pendingRemindersCount,
    },
    tasks: JSON.parse(JSON.stringify(tasks)),
    savingsPots: JSON.parse(JSON.stringify(savingsPots)),
    transactions: JSON.parse(JSON.stringify(transactions)),
    schedule: JSON.parse(JSON.stringify(schedule)),
    subjects: JSON.parse(JSON.stringify(subjects)),
    reminders: JSON.parse(JSON.stringify(reminders)),
    untisConfig: freshUntisConfig ? JSON.parse(JSON.stringify(freshUntisConfig)) : null,
  };
}

export default async function HomePage() {
  const data = await getDashboardData();

  return <DashboardContainer initialData={data} />;
}
