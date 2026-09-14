import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      where: { status: { not: 'archived' } },
      include: { subject: true },
    });

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LifeTracker//Calendar Feed//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:LifeTracker Aufgaben & Vorlesungen',
      'X-WR-TIMEZONE:Europe/Berlin',
    ];

    tasks.forEach((t) => {
      const dtstart = formatICSDate(new Date(t.dueDate));
      const endDate = new Date(new Date(t.dueDate).getTime() + t.estimatedMinutes * 60000);
      const dtend = formatICSDate(endDate);

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:task-${t.id}@lifetracker.app`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:[${t.subject ? t.subject.name : 'Aufgabe'}] ${t.title}`,
        `DESCRIPTION:${t.description || ''} (Geschätzt: ${t.estimatedMinutes} min | Prio: ${t.priority})`,
        `STATUS:${t.status === 'done' ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    return new NextResponse(icsContent.join('\r\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lifetracker-schedule.ics"',
      },
    });
  } catch (error) {
    console.error('iCal error:', error);
    return NextResponse.json({ error: 'Failed to generate iCal feed' }, { status: 500 });
  }
}
