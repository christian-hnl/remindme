import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { findScheduleBlockId } from '@/lib/tasks';
import {
  PRIORITIES,
  TASK_STATUSES,
  cleanString,
  jsonError,
  pickEnum,
  readJson,
  serverError,
  toDate,
  toNumber,
} from '@/lib/api';

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const task = await db.task.findFirst({ where: { id: params.id, userId: user.id } });
    if (!task) return jsonError('Aufgabe nicht gefunden', 404);

    const body = await readJson(req);
    const data: Prisma.TaskUncheckedUpdateInput = {};

    const status = pickEnum(body.status, TASK_STATUSES);
    if (status) data.status = status;
    const priority = pickEnum(body.priority, PRIORITIES);
    if (priority) data.priority = priority;

    if (body.title !== undefined) {
      const title = cleanString(body.title, 200);
      if (!title) return jsonError('Titel darf nicht leer sein');
      data.title = title;
    }
    if (body.description !== undefined) data.description = cleanString(body.description, 5000) || null;

    let dueDate = task.dueDate;
    if (body.dueDate !== undefined) {
      const parsed = toDate(body.dueDate);
      if (!parsed) return jsonError('Ungültiges Fälligkeitsdatum');
      data.dueDate = dueDate = parsed;
    }

    if (body.estimatedMinutes !== undefined) {
      const minutes = toNumber(body.estimatedMinutes);
      if (minutes === null) return jsonError('Ungültiger Zeitaufwand');
      data.estimatedMinutes = Math.min(24 * 60, Math.max(5, Math.round(minutes)));
    }

    let subjectId = task.subjectId;
    if (body.subjectId !== undefined) {
      if (body.subjectId) {
        const subject = await db.subject.findFirst({ where: { id: String(body.subjectId), userId: user.id } });
        if (!subject) return jsonError('Fach nicht gefunden', 404);
        subjectId = subject.id;
      } else {
        subjectId = null;
      }
      data.subjectId = subjectId;
    }

    // Keep the lesson link in sync with subject / due date changes.
    if (body.subjectId !== undefined || body.dueDate !== undefined) {
      data.scheduleBlockId = await findScheduleBlockId(user.id, subjectId, dueDate);
    }

    const updated = await db.task.update({
      where: { id: task.id },
      data,
      include: { subject: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError('PATCH /tasks/[id]', error, 'Aufgabe konnte nicht aktualisiert werden');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { count } = await db.task.deleteMany({ where: { id: params.id, userId: user.id } });
    if (!count) return jsonError('Aufgabe nicht gefunden', 404);
    return NextResponse.json({ success: true, id: params.id });
  } catch (error) {
    return serverError('DELETE /tasks/[id]', error, 'Aufgabe konnte nicht gelöscht werden');
  }
}
