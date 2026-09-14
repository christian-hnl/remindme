import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export async function GET() {
  try {
    const user = await db.user.findFirst();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [tasks, scheduleBlocks, reminders] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id, status: { not: 'archived' } },
        include: { subject: true, scheduleBlock: true },
      }),
      db.scheduleBlock.findMany({
        where: { userId: user.id },
        include: { subject: true },
      }),
      db.reminder.findMany({
        where: { userId: user.id, hasDueDate: true, isDone: false },
      }),
    ]);

    const now = new Date();
    const nowStr = formatICSDate(now);

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LifeTracker//Apple Calendar & Events Sync//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:LifeTracker — Uni, Hausaufgaben & Erinnerungen',
      'X-WR-CALDESC:Synchronisierter Kalender mit WebUntis Stundenplan, Hausaufgaben und Apple Erinnerungen',
      'X-WR-TIMEZONE:Europe/Berlin',
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
      'X-PUBLISHED-TTL:PT15M',
    ];

    // 1. Export Tasks / Hausaufgaben
    tasks.forEach((t) => {
      const dueDate = new Date(t.dueDate);
      const dtstart = formatICSDate(dueDate);
      const endDate = new Date(dueDate.getTime() + t.estimatedMinutes * 60000);
      const dtend = formatICSDate(endDate);

      const subjectPrefix = t.subject ? `[${t.subject.name}] ` : '';
      const location = t.scheduleBlock?.room || '';

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:task-${t.id}@lifetracker.app`,
        `DTSTAMP:${nowStr}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:📚 ${subjectPrefix}${t.title}`,
        `DESCRIPTION:${(t.description || '').replace(/\n/g, ' ')} (Dauer: ${t.estimatedMinutes}m | Prio: ${t.priority}${t.isUntisSync ? ' | WebUntis Sync' : ''})`,
        location ? `LOCATION:${location}` : '',
        `STATUS:${t.status === 'done' ? 'COMPLETED' : 'CONFIRMED'}`,
        'CATEGORIES:Hausaufgaben,Uni,Lernen',
        // Apple Alert (Alarm 1 hour before)
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Hausaufgabe fällig: ${t.title}`,
        'TRIGGER:-PT1H',
        'END:VALARM',
        'END:VEVENT'
      );
    });

    // 2. Export WebUntis Timetable Blocks (Lessons) with Weekly Recurrence
    // Map dayOfWeek: 1=MO, 2=TU, 3=WE, 4=TH, 5=FR, 6=SA, 7=SU
    const dayMap = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

    scheduleBlocks.forEach((b) => {
      const dayCode = dayMap[b.dayOfWeek] || 'MO';

      // Find nearest upcoming date matching this dayOfWeek for base VEVENT
      const baseDate = new Date(now);
      const currentDay = baseDate.getDay() || 7; // Sunday is 7
      const diff = b.dayOfWeek - currentDay;
      baseDate.setDate(baseDate.getDate() + diff);

      const [startH, startM] = (b.startTime || '08:00').split(':').map(Number);
      const [endH, endM] = (b.endTime || '09:30').split(':').map(Number);

      baseDate.setHours(startH, startM, 0, 0);
      const dtstart = formatICSDate(baseDate);

      const endBaseDate = new Date(baseDate);
      endBaseDate.setHours(endH, endM, 0, 0);
      const dtend = formatICSDate(endBaseDate);

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:lesson-${b.id}@lifetracker.app`,
        `DTSTAMP:${nowStr}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${dayCode}`,
        `SUMMARY:🏫 [${b.subjectCode || 'Vorlesung'}] ${b.title}`,
        `LOCATION:${b.room || 'Campus'}`,
        `DESCRIPTION:Lehrkraft: ${b.teacher || 'Unbekannt'}${b.substitutionNote ? ' | Hinweis: ' + b.substitutionNote : ''} | WebUntis Live-Stundenplan`,
        'CATEGORIES:Stundenplan,Vorlesung,Uni',
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    // 3. Export Reminders (with specific due dates)
    reminders.forEach((r) => {
      if (!r.dueDate) return;
      const remDate = new Date(r.dueDate);
      if (r.dueTime) {
        const [rh, rm] = r.dueTime.split(':').map(Number);
        remDate.setHours(rh || 18, rm || 0, 0, 0);
      }
      const dtstart = formatICSDate(remDate);
      const dtend = formatICSDate(new Date(remDate.getTime() + 15 * 60000));

      const personPrefix = r.personName ? `🗣️ An ${r.personName}: ` : '🔔 ';

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:reminder-${r.id}@lifetracker.app`,
        `DTSTAMP:${nowStr}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${personPrefix}${r.title}`,
        `DESCRIPTION:Kategorie: ${r.category}${r.personName ? ' | Person: ' + r.personName : ''}`,
        'CATEGORIES:Erinnerungen,LifeTracker',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Erinnerung: ${r.title}`,
        'TRIGGER:-PT15M',
        'END:VALARM',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    // Filter empty lines
    const cleanICS = icsContent.filter(Boolean).join('\r\n');

    return new NextResponse(cleanICS, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lifetracker-apple-sync.ics"',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Apple iCal feed error:', error);
    return NextResponse.json({ error: 'Failed to generate Apple Calendar sync feed' }, { status: 500 });
  }
}
