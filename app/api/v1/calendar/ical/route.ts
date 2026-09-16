import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { getIcalToken } from '@/lib/auth';
import { serverError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const TZID = 'Europe/Berlin';

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** RFC 5545 text escaping. */
const esc = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** RFC 5545 line folding at 75 octets. */
function fold(line: string) {
  if (Buffer.byteLength(line) <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch);
    if (size + len > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Calendar date of an instant in Berlin, independent of the server time zone. */
function berlinDate(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZID, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return { y: +parts.year, m: +parts.month, d: +parts.day };
}

const dateValue = ({ y, m, d }: { y: number; m: number; d: number }) => `${y}${pad(m)}${pad(d)}`;
const localStamp = (date: { y: number; m: number; d: number }, time: string) =>
  `${dateValue(date)}T${time.replace(':', '').padEnd(4, '0')}00`;

function addDays(date: { y: number; m: number; d: number }, days: number) {
  const d = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

export async function GET(req: Request) {
  const expectedToken = getIcalToken();
  if (expectedToken && new URL(req.url).searchParams.get('token') !== expectedToken) {
    return new NextResponse('Ungültiger oder fehlender Kalender-Token', { status: 401 });
  }

  try {
    const user = await getCurrentUser();
    const [tasks, blocks, reminders] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id, status: { notIn: ['done', 'archived'] } },
        include: { subject: true, scheduleBlock: true },
      }),
      db.scheduleBlock.findMany({ where: { userId: user.id } }),
      db.reminder.findMany({ where: { userId: user.id, hasDueDate: true, isDone: false, dueDate: { not: null } } }),
    ]);

    const now = new Date();
    const dtstamp = `DTSTAMP:${utcStamp(now)}`;
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LifeTracker//Calendar Sync//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:LifeTracker',
      'X-WR-CALDESC:Stundenplan\\, Hausaufgaben und Erinnerungen aus LifeTracker',
      `X-WR-TIMEZONE:${TZID}`,
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
      'X-PUBLISHED-TTL:PT15M',
      ...VTIMEZONE,
    ];

    // Homework: blocked as a work session that ends at the deadline.
    for (const t of tasks) {
      const end = t.dueDate;
      const start = new Date(end.getTime() - t.estimatedMinutes * 60_000);
      const subject = t.subject ? `[${t.subject.name}] ` : '';
      lines.push(
        'BEGIN:VEVENT',
        `UID:task-${t.id}@lifetracker.app`,
        dtstamp,
        `DTSTART:${utcStamp(start)}`,
        `DTEND:${utcStamp(end)}`,
        `SUMMARY:${esc(`📚 ${subject}${t.title}`)}`,
        `DESCRIPTION:${esc(
          [t.description, `Dauer: ${t.estimatedMinutes} min · Priorität: ${t.priority}`].filter(Boolean).join('\n')
        )}`,
        ...(t.scheduleBlock?.room ? [`LOCATION:${esc(t.scheduleBlock.room)}`] : []),
        'CATEGORIES:Hausaufgaben',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(`Hausaufgabe fällig: ${t.title}`)}`,
        'TRIGGER:-PT1H',
        'END:VALARM',
        'END:VEVENT'
      );
    }

    // Lessons: weekly recurring, anchored in the current week (Berlin wall-clock time).
    const today = berlinDate(now);
    const todayWeekday = new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay() || 7;
    const monday = addDays(today, 1 - todayWeekday);
    const dayCodes = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

    for (const b of blocks) {
      const date = addDays(monday, b.dayOfWeek - 1);
      const details = [b.teacher && `Lehrkraft: ${b.teacher}`, b.substitutionNote].filter(Boolean).join('\n');
      lines.push(
        'BEGIN:VEVENT',
        `UID:lesson-${b.id}@lifetracker.app`,
        dtstamp,
        `DTSTART;TZID=${TZID}:${localStamp(date, b.startTime)}`,
        `DTEND;TZID=${TZID}:${localStamp(date, b.endTime)}`,
        // A cancellation only concerns this week, so cancelled lessons don't repeat.
        ...(b.isCancelled ? ['STATUS:CANCELLED'] : [`RRULE:FREQ=WEEKLY;BYDAY=${dayCodes[b.dayOfWeek] ?? 'MO'}`, 'STATUS:CONFIRMED']),
        `SUMMARY:${esc(`🏫 ${b.subjectCode ? `[${b.subjectCode}] ` : ''}${b.title}`)}`,
        ...(b.room ? [`LOCATION:${esc(b.room)}`] : []),
        ...(details ? [`DESCRIPTION:${esc(details)}`] : []),
        'CATEGORIES:Stundenplan',
        'END:VEVENT'
      );
    }

    // Reminders: timed (15 min) or all-day, optionally repeating.
    for (const r of reminders) {
      const date = berlinDate(r.dueDate!);
      const prefix = r.personName ? `🗣️ An ${r.personName}: ` : '🔔 ';
      const timing = r.dueTime
        ? (() => {
            const [h, m] = r.dueTime.split(':').map(Number);
            const endMinutes = h * 60 + m + 15;
            const endDate = endMinutes >= 24 * 60 ? addDays(date, 1) : date;
            const endTime = `${pad(Math.floor(endMinutes / 60) % 24)}:${pad(endMinutes % 60)}`;
            return [
              `DTSTART;TZID=${TZID}:${localStamp(date, r.dueTime)}`,
              `DTEND;TZID=${TZID}:${localStamp(endDate, endTime)}`,
            ];
          })()
        : [`DTSTART;VALUE=DATE:${dateValue(date)}`, `DTEND;VALUE=DATE:${dateValue(addDays(date, 1))}`];

      lines.push(
        'BEGIN:VEVENT',
        `UID:reminder-${r.id}@lifetracker.app`,
        dtstamp,
        ...timing,
        ...(r.repeatPattern === 'daily' || r.repeatPattern === 'weekly'
          ? [`RRULE:FREQ=${r.repeatPattern === 'daily' ? 'DAILY' : 'WEEKLY'}`]
          : []),
        `SUMMARY:${esc(prefix + r.title)}`,
        `DESCRIPTION:${esc(`Kategorie: ${r.category}`)}`,
        'CATEGORIES:Erinnerungen',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(`Erinnerung: ${r.title}`)}`,
        'TRIGGER:-PT15M',
        'END:VALARM',
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');

    return new NextResponse(lines.map(fold).join('\r\n') + '\r\n', {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="lifetracker.ics"',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    return serverError('/calendar/ical', error, 'Kalender-Feed konnte nicht erstellt werden');
  }
}
