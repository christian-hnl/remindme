import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { REPEAT_PATTERNS, cleanString, jsonError, pickEnum, readJson, serverError, toDate } from '@/lib/api';

type Params = { params: { id: string } };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Next occurrence of a repeating reminder that lies today or in the future. */
function nextOccurrence(from: Date, pattern: 'daily' | 'weekly') {
  const step = pattern === 'daily' ? 1 : 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(from);
  next.setHours(0, 0, 0, 0);
  do {
    next.setDate(next.getDate() + step);
  } while (next < today);
  return next;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const reminder = await db.reminder.findFirst({ where: { id: params.id, userId: user.id } });
    if (!reminder) return jsonError('Erinnerung nicht gefunden', 404);

    const body = await readJson(req);
    const data: Prisma.ReminderUpdateInput = {};

    if (body.title !== undefined) {
      const title = cleanString(body.title, 200);
      if (!title) return jsonError('Titel darf nicht leer sein');
      data.title = title;
    }
    if (body.category !== undefined) data.category = cleanString(body.category, 40) || reminder.category;
    if (body.personName !== undefined) data.personName = cleanString(body.personName, 60) || null;
    const priority = pickEnum(body.priority, ['low', 'medium', 'high'] as const);
    if (priority) data.priority = priority;
    const repeatPattern = pickEnum(body.repeatPattern, REPEAT_PATTERNS);
    if (repeatPattern) data.repeatPattern = repeatPattern;

    if (body.hasDueDate !== undefined) {
      data.hasDueDate = !!body.hasDueDate;
      if (!body.hasDueDate) {
        data.dueDate = null;
        data.dueTime = null;
        data.repeatPattern = 'none';
      }
    }
    if (body.dueDate !== undefined && body.hasDueDate !== false) {
      const dueDate = body.dueDate === null ? null : toDate(body.dueDate);
      if (dueDate) dueDate.setHours(0, 0, 0, 0);
      data.dueDate = dueDate;
    }
    if (body.dueTime !== undefined && body.hasDueDate !== false) {
      data.dueTime = typeof body.dueTime === 'string' && TIME_PATTERN.test(body.dueTime) ? body.dueTime : null;
    }

    let rescheduled = false;
    if (body.isDone !== undefined) {
      const pattern = (repeatPattern ?? reminder.repeatPattern) as string;
      if (body.isDone && reminder.hasDueDate && (pattern === 'daily' || pattern === 'weekly')) {
        // Completing a repeating reminder moves it to its next occurrence instead.
        data.dueDate = nextOccurrence(reminder.dueDate ?? new Date(), pattern);
        data.isDone = false;
        rescheduled = true;
      } else {
        data.isDone = !!body.isDone;
      }
    }

    const updated = await db.reminder.update({ where: { id: reminder.id }, data });
    return NextResponse.json({ ...updated, rescheduled });
  } catch (error) {
    return serverError('PATCH /reminders/[id]', error, 'Erinnerung konnte nicht aktualisiert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { count } = await db.reminder.deleteMany({ where: { id: params.id, userId: user.id } });
    if (!count) return jsonError('Erinnerung nicht gefunden', 404);
    return NextResponse.json({ success: true, id: params.id });
  } catch (error) {
    return serverError('DELETE /reminders/[id]', error, 'Erinnerung konnte nicht gelöscht werden');
  }
}
