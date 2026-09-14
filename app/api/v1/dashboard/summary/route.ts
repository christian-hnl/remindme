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

    const [tasks, savingsPots, transactions, schedule, subjects] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id },
        include: { subject: true },
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
        orderBy: { startTime: 'asc' },
      }),
      db.subject.findMany({
        where: { userId: user.id },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Financial calculations
    const incomeTotal = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseTotal = transactions
      .filter((t) => t.type === 'expense' || t.type === 'transfer_to_pot')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalBalance = 2840.50 + (incomeTotal - expenseTotal); // base realistic liquidity
    const monthlySavingsRate = savingsPots.reduce((acc, p) => acc + p.monthlyContribution, 0);

    // Dynamic Safe-to-Spend Calculation (Inspired by Finanzguru & Copilot)
    // Remaining days in current month
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = Math.max(1, lastDayOfMonth - now.getDate() + 1);
    const discretionaryBudget = 580.00; // unallocated free budget for month
    const todaysSpent = transactions
      .filter((t) => {
        const d = new Date(t.transactionDate);
        return d.toDateString() === now.toDateString() && t.type === 'expense' && t.category !== 'Fixkosten';
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const safeToSpendDaily = Math.max(0, +(discretionaryBudget / remainingDays - todaysSpent).toFixed(2));

    // Tasks metrics
    const urgentTasksCount = tasks.filter((t) => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high')).length;
    const todaysStudyMinutes = tasks
      .filter((t) => t.status !== 'done')
      .reduce((acc, t) => acc + t.estimatedMinutes, 0);

    return NextResponse.json({
      user: {
        displayName: user.displayName,
        email: user.email,
      },
      metrics: {
        totalBalance,
        safeToSpendDaily: safeToSpendDaily || 24.50, // default graceful fallback
        monthlySavingsRate: monthlySavingsRate || 250.0,
        urgentTasksCount,
        todaysStudyMinutes,
        fixedCostsCovered: true,
      },
      tasks,
      savingsPots,
      transactions,
      schedule,
      subjects,
    });
  } catch (error) {
    console.error('API Error /dashboard/summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
