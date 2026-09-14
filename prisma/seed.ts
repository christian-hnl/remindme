import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with realistic Life & Finance Dashboard data...');

  // 1. Create or upsert Default User
  const user = await prisma.user.upsert({
    where: { email: 'alexander@example.com' },
    update: {},
    create: {
      email: 'alexander@example.com',
      displayName: 'Alexander',
      preferences: JSON.stringify({
        theme: 'dark',
        currency: 'EUR',
        active_mode: 'all',
        monthly_budget: 800,
      }),
    },
  });

  // 2. Clear previous records if any for clean slate
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.savingsPot.deleteMany({ where: { userId: user.id } });
  await prisma.scheduleBlock.deleteMany({ where: { userId: user.id } });
  await prisma.subject.deleteMany({ where: { userId: user.id } });

  // 3. Create Subjects
  const mathe = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'Mathe',
      colorHex: '#6366F1', // Linear Blue
      icon: 'calculator',
    },
  });

  const physik = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'Physik',
      colorHex: '#F59E0B', // Amber
      icon: 'atom',
    },
  });

  const info = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'Informatik',
      colorHex: '#8B5CF6', // Cron Iris
      icon: 'terminal',
    },
  });

  const latein = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'Latein',
      colorHex: '#EC4899', // Pink
      icon: 'languages',
    },
  });

  const bwl = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'BWL',
      colorHex: '#10B981', // Copilot Mint
      icon: 'briefcase',
    },
  });

  // 4. Create Tasks (Inspired directly by design.md)
  const today = new Date();
  today.setHours(18, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const inThreeDays = new Date(today);
  inThreeDays.setDate(inThreeDays.getDate() + 3);

  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        subjectId: mathe.id,
        title: 'Matheblatt 04 — Vektorrechnung',
        description: 'Aufgaben 1 bis 4 auf Folie 12 lösen und als PDF einreichen.',
        dueDate: tomorrow,
        estimatedMinutes: 45,
        priority: 'urgent',
        status: 'in_progress',
      },
      {
        userId: user.id,
        subjectId: physik.id,
        title: 'Physik Protokoll fertigstellen',
        description: 'Messergebnisse des Pendelversuchs in Diagramm einfügen.',
        dueDate: today,
        estimatedMinutes: 30,
        priority: 'urgent',
        status: 'backlog',
      },
      {
        userId: user.id,
        subjectId: latein.id,
        title: 'Latein Vokabeln Lektion 12',
        description: 'Substantive der u-Deklination wiederholen.',
        dueDate: today,
        estimatedMinutes: 15,
        priority: 'medium',
        status: 'backlog',
      },
      {
        userId: user.id,
        subjectId: bwl.id,
        title: 'BWL Präsentation Folien',
        description: 'Marktanalyse und SWOT-Matrix für das Start-up-Projekt ausarbeiten.',
        dueDate: inThreeDays,
        estimatedMinutes: 90,
        priority: 'high',
        status: 'backlog',
      },
      {
        userId: user.id,
        subjectId: info.id,
        title: 'Algorithmen & Datenstrukturen Blatt 3',
        description: 'Binary Search Tree Traversierung in Python implementieren.',
        dueDate: inThreeDays,
        estimatedMinutes: 60,
        priority: 'medium',
        status: 'backlog',
      },
      {
        userId: user.id,
        subjectId: mathe.id,
        title: 'Mathe Quiz Vorbereitung',
        description: 'Kurvendiskussion & Ableitungsregeln wiederholt.',
        dueDate: new Date(Date.now() - 86400000), // yesterday
        estimatedMinutes: 40,
        priority: 'medium',
        status: 'done',
      },
    ],
  });

  // 5. Create Savings Pots (Inspired directly by design.md)
  const macbookDate = new Date();
  macbookDate.setMonth(macbookDate.getMonth() + 3);

  const urlaubDate = new Date();
  urlaubDate.setFullYear(urlaubDate.getFullYear() + 1);

  const potMacbook = await prisma.savingsPot.create({
    data: {
      userId: user.id,
      name: 'MacBook Pro M4',
      targetAmount: 1400.0,
      currentAmount: 850.0,
      monthlyContribution: 183.0,
      targetDate: macbookDate,
      icon: 'laptop',
      colorHex: '#6366F1',
    },
  });

  const potUrlaub = await prisma.savingsPot.create({
    data: {
      userId: user.id,
      name: 'Sommerurlaub 2027',
      targetAmount: 1000.0,
      currentAmount: 350.0,
      monthlyContribution: 50.0,
      targetDate: urlaubDate,
      icon: 'palmtree',
      colorHex: '#10B981',
    },
  });

  await prisma.savingsPot.create({
    data: {
      userId: user.id,
      name: 'Notgroschen',
      targetAmount: 3000.0,
      currentAmount: 2000.0,
      monthlyContribution: 100.0,
      icon: 'shield-check',
      colorHex: '#8B5CF6',
    },
  });

  // 6. Create Transactions
  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        title: 'Werkstudentengehalt',
        amount: 1250.0,
        category: 'Einkommen',
        type: 'income',
        isRecurring: true,
        transactionDate: new Date(),
      },
      {
        userId: user.id,
        title: 'Bäcker (Frühstück)',
        amount: -4.5,
        category: 'Lebensmittel',
        type: 'expense',
        isRecurring: false,
        transactionDate: new Date(),
      },
      {
        userId: user.id,
        title: 'Deutschlandticket',
        amount: -49.0,
        category: 'Fixkosten',
        type: 'expense',
        isRecurring: true,
        transactionDate: new Date(Date.now() - 86400000),
      },
      {
        userId: user.id,
        title: 'Supermarkt Einkauf REWE',
        amount: -38.2,
        category: 'Lebensmittel',
        type: 'expense',
        isRecurring: false,
        transactionDate: new Date(Date.now() - 86400000 * 2),
      },
      {
        userId: user.id,
        title: 'Gym Mitgliedschaft',
        amount: -29.9,
        category: 'Fixkosten',
        type: 'expense',
        isRecurring: true,
        transactionDate: new Date(Date.now() - 86400000 * 5),
      },
      {
        userId: user.id,
        savingsPotId: potMacbook.id,
        title: 'Sparrate MacBook',
        amount: -50.0,
        category: 'Sparen',
        type: 'transfer_to_pot',
        isRecurring: false,
        transactionDate: new Date(Date.now() - 86400000 * 3),
      },
    ],
  });

  // 7. Create Schedule Blocks (Timetable)
  await prisma.scheduleBlock.createMany({
    data: [
      {
        userId: user.id,
        title: 'Mathe Vorlesung (Analysis II)',
        dayOfWeek: 1, // Montag
        startTime: '09:00',
        endTime: '11:00',
        room: 'Hörsaal 3',
        colorHex: '#6366F1',
      },
      {
        userId: user.id,
        title: 'Mittagspause & Mensa',
        dayOfWeek: 1,
        startTime: '11:30',
        endTime: '12:00',
        room: 'Mensa Campus',
        colorHex: '#64748B',
      },
      {
        userId: user.id,
        title: 'Informatik Übung (Algorithmen)',
        dayOfWeek: 1,
        startTime: '12:00',
        endTime: '13:30',
        room: 'Raum 204',
        colorHex: '#8B5CF6',
      },
      {
        userId: user.id,
        title: 'Hausaufgaben & Deep Work Block',
        dayOfWeek: 1,
        startTime: '14:00',
        endTime: '15:30',
        room: 'Bib / Quiet Zone',
        colorHex: '#F59E0B',
      },
      {
        userId: user.id,
        title: 'Fitness / Gym Workout',
        dayOfWeek: 1,
        startTime: '18:00',
        endTime: '19:30',
        room: 'Gym',
        colorHex: '#10B981',
      },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
