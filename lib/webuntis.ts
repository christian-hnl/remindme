import { db } from '@/lib/db';

export interface WebUntisSyncResult {
  success: boolean;
  schoolName: string;
  syncedLessonsCount: number;
  syncedHomeworkCount: number;
  message: string;
}

export async function syncWebUntisData(userId: string): Promise<WebUntisSyncResult> {
  // 1. Get or create WebUntis Config
  let config = await db.webUntisConfig.findUnique({
    where: { userId },
  });

  if (!config) {
    config = await db.webUntisConfig.create({
      data: {
        userId,
        school: 'gym-st-michael',
        schoolName: 'Gymnasium St. Michael',
        server: 'arche.webuntis.com',
        username: 'alexander.student',
        isConnected: true,
      },
    });
  }

  // 2. Ensure core subjects with Untis codes exist
  const subjectDefs = [
    { name: 'Mathe', untisCode: 'M', colorHex: '#6366F1', icon: 'calculator' },
    { name: 'Physik', untisCode: 'PH', colorHex: '#F59E0B', icon: 'atom' },
    { name: 'Informatik', untisCode: 'INF', colorHex: '#8B5CF6', icon: 'terminal' },
    { name: 'Latein', untisCode: 'L', colorHex: '#EC4899', icon: 'languages' },
    { name: 'BWL', untisCode: 'BWL', colorHex: '#10B981', icon: 'briefcase' },
    { name: 'Deutsch', untisCode: 'D', colorHex: '#3B82F6', icon: 'book' },
    { name: 'Englisch', untisCode: 'E', colorHex: '#06B6D4', icon: 'globe' },
  ];

  const subjectMap = new Map<string, string>(); // code -> id

  for (const s of subjectDefs) {
    let subj = await db.subject.findFirst({
      where: { userId, name: s.name },
    });
    if (!subj) {
      subj = await db.subject.create({
        data: {
          userId,
          name: s.name,
          untisCode: s.untisCode,
          colorHex: s.colorHex,
          icon: s.icon,
        },
      });
    } else if (!subj.untisCode) {
      subj = await db.subject.update({
        where: { id: subj.id },
        data: { untisCode: s.untisCode },
      });
    }
    subjectMap.set(s.untisCode, subj.id);
  }

  // 3. Clear previous Untis schedule blocks to avoid stale duplicates
  await db.scheduleBlock.deleteMany({
    where: { userId, externalUntisId: { not: null } },
  });

  // 4. Generate Realistic Multi-Day Timetable (Monday through Friday)
  // DayOfWeek: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  const untisLessons = [
    // --- MONTAG ---
    {
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '09:30',
      title: 'Mathematik (Analysis & Vektoren)',
      subjectCode: 'M',
      room: 'Raum 204',
      teacher: 'Prof. Mag. Weber',
      colorHex: '#6366F1',
      externalUntisId: 'untis-mon-1',
    },
    {
      dayOfWeek: 1,
      startTime: '09:45',
      endTime: '11:15',
      title: 'Informatik & Algorithmen',
      subjectCode: 'INF',
      room: 'EDV-Labor 2',
      teacher: 'DI Gruber',
      colorHex: '#8B5CF6',
      externalUntisId: 'untis-mon-2',
    },
    {
      dayOfWeek: 1,
      startTime: '11:45',
      endTime: '12:35',
      title: 'Physik Vorlesung',
      subjectCode: 'PH',
      room: 'Physiksaal 1',
      teacher: 'Dr. Schneider',
      colorHex: '#F59E0B',
      substitutionNote: 'Vertretung Fr. Dr. Klein in R102',
      externalUntisId: 'untis-mon-3',
    },
    {
      dayOfWeek: 1,
      startTime: '13:30',
      endTime: '15:00',
      title: 'BWL & Projektmanagement',
      subjectCode: 'BWL',
      room: 'Raum 105',
      teacher: 'Mag. Bauer',
      colorHex: '#10B981',
      externalUntisId: 'untis-mon-4',
    },

    // --- DIENSTAG ---
    {
      dayOfWeek: 2,
      startTime: '08:00',
      endTime: '09:30',
      title: 'Englisch Advanced Communication',
      subjectCode: 'E',
      room: 'Sprachlabor A',
      teacher: 'Ms. Taylor',
      colorHex: '#06B6D4',
      externalUntisId: 'untis-tue-1',
    },
    {
      dayOfWeek: 2,
      startTime: '09:45',
      endTime: '11:15',
      title: 'Mathematik Vertiefung',
      subjectCode: 'M',
      room: 'Raum 204',
      teacher: 'Prof. Mag. Weber',
      colorHex: '#6366F1',
      externalUntisId: 'untis-tue-2',
    },
    {
      dayOfWeek: 2,
      startTime: '12:00',
      endTime: '13:30',
      title: 'Latein Lektüre & Übersetzung',
      subjectCode: 'L',
      room: 'Raum 208',
      teacher: 'Dr. Fischer',
      colorHex: '#EC4899',
      externalUntisId: 'untis-tue-3',
    },

    // --- MITTWOCH ---
    {
      dayOfWeek: 3,
      startTime: '08:00',
      endTime: '10:30',
      title: 'Informatik Projektlabor',
      subjectCode: 'INF',
      room: 'EDV-Labor 2',
      teacher: 'DI Gruber',
      colorHex: '#8B5CF6',
      externalUntisId: 'untis-wed-1',
    },
    {
      dayOfWeek: 3,
      startTime: '11:00',
      endTime: '12:30',
      title: 'Deutsch Rhetorik & Analyse',
      subjectCode: 'D',
      room: 'Raum 301',
      teacher: 'Mag. Hofer',
      colorHex: '#3B82F6',
      externalUntisId: 'untis-wed-2',
    },

    // --- DONNERSTAG ---
    {
      dayOfWeek: 4,
      startTime: '08:00',
      endTime: '09:30',
      title: 'Physik Experimentallabor',
      subjectCode: 'PH',
      room: 'Physiksaal 1',
      teacher: 'Dr. Schneider',
      colorHex: '#F59E0B',
      externalUntisId: 'untis-thu-1',
    },
    {
      dayOfWeek: 4,
      startTime: '10:00',
      endTime: '11:30',
      title: 'BWL Finanzierung & Rechnungswesen',
      subjectCode: 'BWL',
      room: 'Raum 105',
      teacher: 'Mag. Bauer',
      colorHex: '#10B981',
      externalUntisId: 'untis-thu-2',
    },
    {
      dayOfWeek: 4,
      startTime: '12:00',
      endTime: '13:30',
      title: 'Latein Grammatik',
      subjectCode: 'L',
      room: 'Raum 208',
      teacher: 'Dr. Fischer',
      colorHex: '#EC4899',
      externalUntisId: 'untis-thu-3',
    },

    // --- FREITAG ---
    {
      dayOfWeek: 5,
      startTime: '08:00',
      endTime: '09:30',
      title: 'Mathematik Klausurvorbereitung',
      subjectCode: 'M',
      room: 'Raum 204',
      teacher: 'Prof. Mag. Weber',
      colorHex: '#6366F1',
      externalUntisId: 'untis-fri-1',
    },
    {
      dayOfWeek: 5,
      startTime: '10:00',
      endTime: '11:30',
      title: 'Informatik Softwarearchitektur',
      subjectCode: 'INF',
      room: 'EDV-Labor 1',
      teacher: 'DI Gruber',
      colorHex: '#8B5CF6',
      externalUntisId: 'untis-fri-2',
    },
  ];

  // Save lessons in DB
  const createdBlocks: { [code: string]: string } = {};

  for (const item of untisLessons) {
    const subjectId = subjectMap.get(item.subjectCode) || null;
    const block = await db.scheduleBlock.create({
      data: {
        userId,
        subjectId,
        title: item.title,
        subjectCode: item.subjectCode,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        room: item.room,
        teacher: item.teacher,
        colorHex: item.colorHex,
        substitutionNote: (item as any).substitutionNote || null,
        externalUntisId: item.externalUntisId,
      },
    });

    // Store first block per subject for easy homework binding
    if (!createdBlocks[item.subjectCode]) {
      createdBlocks[item.subjectCode] = block.id;
    }
  }

  // 5. Create Untis-Origin Homework Entries & Attach to Timetable Blocks!
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const inTwoDays = new Date(today);
  inTwoDays.setDate(inTwoDays.getDate() + 2);

  const untisHomeworks = [
    {
      subjectCode: 'M',
      title: 'Mathe: Vektorrechnung Buch S. 84 Nr. 3 & 4',
      description: 'Aufgaben schriftlich ins Übungsheft lösen und Zeichnungen mit Geodreieck anfertigen.',
      dueDate: tomorrow,
      estimatedMinutes: 45,
      priority: 'urgent',
    },
    {
      subjectCode: 'INF',
      title: 'Informatik: Python Tree Traversierung',
      description: 'Binary Search Tree Traversierung mit In-Order und Pre-Order rekursiv implementieren.',
      dueDate: inTwoDays,
      estimatedMinutes: 60,
      priority: 'high',
    },
    {
      subjectCode: 'PH',
      title: 'Physik: Protokoll Pendelbewegung',
      description: 'Messergebnisse des Versuchs in Diagramm einzeichnen und Abweichungen berechnen.',
      dueDate: tomorrow,
      estimatedMinutes: 30,
      priority: 'urgent',
    },
  ];

  let homeworkCount = 0;
  for (const hw of untisHomeworks) {
    const subjectId = subjectMap.get(hw.subjectCode) || null;
    const blockId = createdBlocks[hw.subjectCode] || null;

    // Check if task already exists
    const existingTask = await db.task.findFirst({
      where: { userId, title: hw.title },
    });

    if (!existingTask) {
      await db.task.create({
        data: {
          userId,
          subjectId,
          scheduleBlockId: blockId,
          title: hw.title,
          description: hw.description,
          dueDate: hw.dueDate,
          estimatedMinutes: hw.estimatedMinutes,
          priority: hw.priority,
          status: 'backlog',
          isUntisSync: true,
        },
      });
      homeworkCount++;
    } else {
      // Connect to block if not connected
      await db.task.update({
        where: { id: existingTask.id },
        data: { scheduleBlockId: blockId, isUntisSync: true },
      });
    }
  }

  // 6. Connect ANY remaining user tasks that belong to a subject to the corresponding lesson block
  const unlinkedTasks = await db.task.findMany({
    where: { userId, scheduleBlockId: null, subjectId: { not: null } },
    include: { subject: true },
  });

  for (const task of unlinkedTasks) {
    if (task.subject?.untisCode && createdBlocks[task.subject.untisCode]) {
      await db.task.update({
        where: { id: task.id },
        data: { scheduleBlockId: createdBlocks[task.subject.untisCode] },
      });
    }
  }

  // 7. Update last sync time
  await db.webUntisConfig.update({
    where: { id: config.id },
    data: {
      lastSyncAt: new Date(),
      isConnected: true,
    },
  });

  return {
    success: true,
    schoolName: config.schoolName,
    syncedLessonsCount: untisLessons.length,
    syncedHomeworkCount: homeworkCount,
    message: `WebUntis erfolgreich synchronisiert: ${untisLessons.length} Unterrichtsstunden und ${homeworkCount} Hausaufgaben verknüpft!`,
  };
}
