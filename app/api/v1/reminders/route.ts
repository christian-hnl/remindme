import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { REPEAT_PATTERNS, cleanString, jsonError, pickEnum, readJson, serverError, toDate } from '@/lib/api';

export const dynamic = 'force-dynamic';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET() {
  try {
    const user = await getCurrentUser();
    const reminders = await db.reminder.findMany({
      where: { userId: user.id },
      orderBy: [{ isDone: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(reminders);
  } catch (error) {
    return serverError('GET /reminders', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const title = cleanString(body.title, 200);
    if (!title) return jsonError('Titel ist erforderlich');

    const personName = cleanString(body.personName, 60) || null;
    const hasDueDate = body.hasDueDate !== undefined ? !!body.hasDueDate : true;
    const dueDate = hasDueDate ? toDate(body.dueDate) ?? new Date() : null;
    if (dueDate) dueDate.setHours(0, 0, 0, 0);
    const dueTime = hasDueDate && typeof body.dueTime === 'string' && TIME_PATTERN.test(body.dueTime) ? body.dueTime : null;

    const user = await getCurrentUser();
    const reminder = await db.reminder.create({
      data: {
        userId: user.id,
        title,
        category: cleanString(body.category, 40) || (personName ? 'Person' : 'Haushalt'),
        hasDueDate,
        dueDate,
        dueTime,
        personName,
        reminderType: cleanString(body.reminderType, 20) || (personName ? 'say_to_person' : 'todo'),
        icon: cleanString(body.icon, 30) || (personName ? 'user' : 'bell'),
        priority: pickEnum(body.priority, ['low', 'medium', 'high'] as const) ?? 'medium',
        repeatPattern: hasDueDate ? pickEnum(body.repeatPattern, REPEAT_PATTERNS) ?? 'none' : 'none',
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    return serverError('POST /reminders', error, 'Erinnerung konnte nicht erstellt werden');
  }
}
