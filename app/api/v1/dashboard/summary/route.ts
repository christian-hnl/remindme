import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await db.user.findFirst({
      where: { email: 'alexander@example.com' },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [tasks, savingsPots, transactions, schedule, subjects, reminders, untisConfig] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id },
        include: { subject: true, scheduleBlock: true },
        orderBy: [
          { status: 'asc' },
          { dueDate: 'asc' },
        ],
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

    // Financial calculations
    const incomeTotal = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseTotal = transactions
      .filter((t) => t.type === 'expense' || t.type === 'transfer_to_pot')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalBalance = 2840.50 + (incomeTotal - expenseTotal);
    const monthlySavingsRate = savingsPots.reduce((acc, p) => acc + p.monthlyContribution, 0);

    // Dynamic Safe-to-Spend
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = Math.max(1, lastDayOfMonth - now.getDate() + 1);
    const discretionaryBudget = 580.00;
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

    return NextResponse.json({
      user: {
        displayName: user.displayName,
        email: user.email,
      },
      metrics: {
        totalBalance,
        safeToSpendDaily: safeToSpendDaily || 24.50,
        monthlySavingsRate: monthlySavingsRate || 250.0,
        urgentTasksCount,
        todaysStudyMinutes,
        fixedCostsCovered: true,
        pendingRemindersCount,
      },
      tasks,
      savingsPots,
      transactions,
      schedule,
      subjects,
      reminders,
      untisConfig,
    });
  } catch (error) {
    console.error('API Error /dashboard/summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
