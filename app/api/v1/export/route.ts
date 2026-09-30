import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { toSafeUntisConfig } from '@/lib/webuntis';
import { serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Full JSON backup of every record belonging to the user (without credentials). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const where = { userId: user.id };
    const [subjects, tasks, schedule, reminders, notes, savingsPots, transactions, untisConfig, exams, grades, shopping, habits, birthdays, bankAccounts, skills, categoryBudgets, categoryRules] = await Promise.all([
      db.subject.findMany({ where }),
      db.task.findMany({ where }),
      db.scheduleBlock.findMany({ where }),
      db.reminder.findMany({ where }),
      db.note.findMany({ where }),
      db.savingsPot.findMany({ where }),
      db.transaction.findMany({ where, orderBy: { transactionDate: 'desc' } }),
      db.webUntisConfig.findUnique({ where }),
      db.exam.findMany({ where }),
      db.grade.findMany({ where }),
      db.shoppingItem.findMany({ where }),
      db.habit.findMany({ where, include: { logs: true } }),
      db.birthday.findMany({ where }),
      db.bankAccount.findMany({ where, select: { id: true, name: true, source: true, iban: true, currency: true, balance: true, includeInBalance: true } }),
      db.skill.findMany({ where, include: { steps: true, resources: true, sessions: true } }),
      db.categoryBudget.findMany({ where }),
      db.categoryRule.findMany({ where }),
    ]);
    const [nutritionSettings, recipes, mealWeeks, mealLogs, bodyMetrics] = await Promise.all([
      db.nutritionSettings.findUnique({ where }),
      db.recipe.findMany({ where, include: { ingredients: { include: { ingredient: { select: { slug: true } } } } } }),
      db.mealWeek.findMany({ where, include: { entries: true } }),
      db.mealLog.findMany({ where, orderBy: { day: 'desc' } }),
      db.bodyMetric.findMany({ where, orderBy: { day: 'desc' } }),
    ]);

    const stamp = new Date().toISOString().slice(0, 10);
    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        user: {
          displayName: user.displayName,
          email: user.email,
          monthlyBudget: user.monthlyBudget,
          startingBalance: user.startingBalance,
        },
        subjects,
        tasks,
        schedule,
        reminders,
        notes,
        savingsPots,
        transactions,
        exams,
        grades,
        shopping,
        habits,
        birthdays,
        bankAccounts,
        skills,
        categoryBudgets,
        categoryRules,
        untisConfig: toSafeUntisConfig(untisConfig),
        nutrition: { settings: nutritionSettings, recipes, weeks: mealWeeks, logs: mealLogs, body: bodyMetrics },
      },
      { headers: { 'Content-Disposition': `attachment; filename="lifetracker-backup-${stamp}.json"` } }
    );
  } catch (error) {
    return serverError('/export', error);
  }
}
