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

  // Ensure Untis schedule
  const untisConfig = await db.webUntisConfig.findUnique({
    where: { userId: user.id },
  });
  if (!untisConfig) {
    await syncWebUntisData(user.id);
  }

  // Ensure default reminders exist
  const reminderCount = await db.reminder.count({ where: { userId: user.id } });
  if (reminderCount === 0) {
    await db.reminder.createMany({
      data: [
        {
          userId: user.id,
          title: 'Bescheid sagen wegen Treffen am Wochenende',
          personName: 'Mama',
          reminderType: 'say_to_person',
          hasDueDate: false,
          category: 'Person',
          icon: 'user',
          priority: 'medium',
        },
        {
          userId: user.id,
          title: 'Wäsche rausbringen / aufhängen',
          reminderType: 'action',
          hasDueDate: true,
          dueTime: '18:30',
          dueDate: new Date(),
          category: 'Haushalt',
          icon: 'shirt',
          priority: 'medium',
        },
        {
          userId: user.id,
          title: 'Fragen wegen Nachprüfung & Foliensatz',
          personName: 'Hr. Weber',
          reminderType: 'say_to_person',
          hasDueDate: true,
          dueTime: '09:45',
          dueDate: new Date(),
          category: 'Uni',
          icon: 'user',
          priority: 'high',
        },
        {
          userId: user.id,
          title: 'Paket aus Packstation abholen (Code: 842)',
          reminderType: 'action',
          hasDueDate: false,
          category: 'Erledigung',
          icon: 'package',
          priority: 'medium',
        },
      ],
    });
  }

  // Ensure default notes exist
  const notesCount = await db.note.count({ where: { userId: user.id } });
  if (notesCount === 0) {
    await db.note.createMany({
      data: [
        {
          userId: user.id,
          title: '💡 Ideen & Gedanken für den Herbst',
          content: '1. Mehr Zeit für fokussierte Deep Work Sessions vor 12 Uhr einplanen.\n2. Wochenende für Erholung und Freunde freihalten.\n3. Spartopf MacBook Pro M4 konsequent mit monatlich 183€ besparen.\n4. Untis Stundenplan mit Notizen synchron halten.',
          category: 'Gedanken',
          isPinned: true,
          colorHex: '#6366F1',
        },
        {
          userId: user.id,
          title: '📚 Mathematik II: Wichtige Formeln & Ableitungen',
          content: '• Kettenregel: (f(g(x))) = f\'(g(x)) * g\'(x)\n• Produktregel: (u*v)\' = u\'v + uv\'\n• Vektorrechnung: Skalarprodukt a · b = |a||b| cos(theta)\n• Klausurtermin im Kalender blocken!',
          category: 'Uni',
          isPinned: false,
          colorHex: '#8B5CF6',
        },
      ],
    });
  }

  const [tasks, savingsPots, transactions, schedule, subjects, reminders, notes, freshUntisConfig] = await Promise.all([
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
        { createdAt: 'desc' },
      ],
    }),
    db.note.findMany({
      where: { userId: user.id },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
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
      notesCount: notes.length,
    },
    tasks: JSON.parse(JSON.stringify(tasks)),
    savingsPots: JSON.parse(JSON.stringify(savingsPots)),
    transactions: JSON.parse(JSON.stringify(transactions)),
    schedule: JSON.parse(JSON.stringify(schedule)),
    subjects: JSON.parse(JSON.stringify(subjects)),
    reminders: JSON.parse(JSON.stringify(reminders)),
    notes: JSON.parse(JSON.stringify(notes)),
    untisConfig: freshUntisConfig ? JSON.parse(JSON.stringify(freshUntisConfig)) : null,
  };
}

export default async function HomePage() {
  const data = await getDashboardData();

  return <DashboardContainer initialData={data} />;
}
